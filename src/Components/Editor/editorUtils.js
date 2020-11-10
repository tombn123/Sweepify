/* eslint-disable no-undef */
import Interpreter from "js-interpreter";

import scopeFunctions from "./interpreterScope";
import * as mappingAlgorithms from "../../Algorithms/mappingAlgorithms";
import * as cleaningAlgorithms from "../../Algorithms/cleaningAlgorithms";

import staticConfigs from "./configs.json";

import validators from "./validators";
import Exception from "../../Classes/Exception";

import {
  TIME_LIMIT_EXCEEDED,
  NO_BATTERY,
  COMPILATION_FAILED,
} from "./Message/messages";

import Robot from "../../Classes/Robot";
import { EXECUTE } from "./code";

export const createSandboxedInterpreter = (code, context) => {
  const establishEnvironment = (context, interpreter) => {
    const isPrimitive = (value) => Object(value) !== value;
    const isBatteryEmpty = () =>
      Math.floor((availableSteps / (grid.length * grid[0].length)) * 100) === 0;

    const { grid, availableSteps, startNode } = context.state;
    const { robot } = context;

    if (isBatteryEmpty()) {
      throw new Exception(NO_BATTERY);
    }
    robot.syncMapLayoutWithGrid(grid);
    const scopeArgs = [
      { name: "grid", value: grid },
      { name: "map", value: robot.map },
      {
        name: "dockingStation",
        value: robot.map[startNode.row][startNode.col],
      },
      { name: "availableSteps", value: availableSteps },
    ];

    scopeArgs.forEach((arg) => {
      interpreter.setValueToScope(
        arg.name,
        isPrimitive(arg.value)
          ? arg.value
          : interpreter.nativeToPseudo(arg.value)
      );
    });

    scopeFunctions.forEach((funcObj) => {
      interpreter.setValueToScope(
        funcObj.name,
        interpreter.nativeToPseudo(funcObj.func)
      );
    });
  };
  const compileToES5 = (code) => {
    const loadBabel = () => {
      if (!window.Babel) {
        loadScript("https://unpkg.com/@babel/standalone/babel.min.js");
      }
    };
    try {
      loadBabel();
      return Babel.transform(code, {
        presets: ["es2015"],
        sourceType: "script",
      }).code;
    } catch (err) {
      throw new Exception(COMPILATION_FAILED);
    }
  };
  try {
    const interpreter = new Interpreter(compileToES5(code));
    interpreter.appendCode(EXECUTE);
    establishEnvironment(context, interpreter);
    return interpreter;
  } catch (err) {
    throw new Exception(err.message);
  }
};

export const loadScript = (url, callback) => {
  let script = document.createElement("script");
  script.type = "text/javascript";

  if (script.readyState) {
    //IE
    script.onreadystatechange = function () {
      if (script.readyState === "loaded" || script.readyState === "complete") {
        script.onreadystatechange = null;
        callback && callback();
      }
    };
  } else {
    //Others
    script.onload = function () {
      callback && callback();
    };
  }

  script.src = url;
  document.getElementsByTagName("head")[0].appendChild(script);
};

export const restrictEditingSegment = (editor) => {
  editor.getSession().setMode({ path: "ace/mode/javascript", inline: true });
  // Prevent editing first and last line of editor
  editor.commands.on("exec", function (e) {
    const position = editor.selection.getCursor();
    if (position.row === 0 || position.row + 1 === editor.session.getLength()) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
};

export const extendAutocomplete = (editor) => {
  const funcProtoString = (funcObj) => {
    const { name, func } = funcObj;
    const parsedFunc = func.toString();
    const args = parsedFunc.substring(0, parsedFunc.indexOf("=") - 1);
    const numArgs = args.split(",").length - 1;
    const resArgs = numArgs ? args : `(${args})`;
    return `${name}${resArgs};`;
  };

  const createWordsArray = (session, scopeFunctions, localKeywords) => [
    ...scopeFunctions.map((funcObj) => {
      return {
        caption: funcObj.name,
        value: funcProtoString(funcObj),
        meta: "function",
      };
    }),
    ...session.$mode.$highlightRules.$keywordList.map(function (word) {
      return {
        caption: word,
        value: word,
        meta: "keyword",
      };
    }),
    ...localKeywords.map((word) => {
      return {
        caption: word,
        value: word,
        meta: "local",
      };
    }),
  ];

  const localKeywords = ["grid", "map", "availableSteps", "dockingStation"];
  const autoComplete = {
    getCompletions: (editor, session, pos, prefix, callback) => {
      callback(null, createWordsArray(session, scopeFunctions, localKeywords));
    },
  };
  editor.completers = [autoComplete];
};

export const validate = (result, context) => {
  for (const validator of validators) {
    validator(result, context);
  }
};

export const getBenchmarkAlgorithms = (simulationType) => {
  return simulationType === "map"
    ? mappingAlgorithms.data
    : cleaningAlgorithms.data;
};

export const getBenchmarkConfigs = (simulationType) => {
  const adjustMapToSimulationType = (map) => {
    for (const node of map.flat()) {
      node.isMapped = simulationType === "sweep" && !node.isWall ? true : false;
    }
  };
  const addDummyRobotToConfig = (config) => {
    /* 
  When first importing the configs.json file, we want to assign a dummy robot to each config so we can simulate execution of each algorithm
  and configuration combination. a correct simulation is dependent on having a robot object in the context of the execution. 
  */
    const { grid, map } = config;
    const dummy = new Robot(grid);
    dummy.map = map;
    delete config.map;
    config.robot = dummy;
  };
  const configs = JSON.parse(JSON.stringify(staticConfigs));
  for (const config of Object.values(configs)) {
    !config.robot && addDummyRobotToConfig(config);
    config.robot.syncMapLayoutWithGrid(config.grid);
    adjustMapToSimulationType(config.robot.map, simulationType);
  }
  return configs;
};

//prettier-ignore
export const measure = (algorithm, config, simulationType) => {
  const runInterpreterCalculateRuntime = (algorithm, config) => {
    const buildContextFromConfig = (config) => {
      const { grid, robot, startNode, availableSteps } = config;
      return { state: { grid, startNode, availableSteps }, robot };
    };
    const interpreter = createSandboxedInterpreter(
      algorithm.code,
      buildContextFromConfig(config)
    );
    const t0 = performance.now();
    interpreter.run();
    const t1 = performance.now();
    const path = interpreter.pseudoToNative(interpreter.value);
    return [path, (t1 - t0)/200];
  };
  const runNativeAlgorithmCalculateRuntime = (algorithm, config) => {
    const { grid, robot, startNode, availableSteps } = config;
    const {row, col} = startNode;
    const dockingStation = robot.map[row][col];
    const map = robot.map;
    const t0 = performance.now();
    const path = algorithm.func(grid,map,dockingStation,availableSteps);
    const t1 = performance.now();

    return [path, t1 - t0];
  };
  const calculateEfficiency = (path, config, simulationType) => {
    const calcMappingEfficiency = (path, map) => {
      /* 
      Calculates how much we have extended the previous map, meaning, how much new nodes has been added to the map, 
      in relation to the total unmapped nodes on the grid, when launching the algorithm. 
      */
      const unmappedNodesCount = map.flat().filter((node) => !node.isMapped)
        .length;

      const uniqueNodesFromPath = path.filter(
        (a, b, c) =>
          c.findIndex((t) => t.row === a.row && t.col === a.col) === b
      );

      let mapExtendingNodes = uniqueNodesFromPath.filter(
        (node) => !node.isMapped
      );

      return (mapExtendingNodes.length / unmappedNodesCount) * 100;
    };
    const calcSweepingEfficiency = (path, grid) => {
      /* 
      Calculates how much dust did we clean in relation to the total amount of dust on the grid. 
      */
     const uniqueNodesFromPath = path.filter(
      (a, b, c) =>
        c.findIndex((t) => t.row === a.row && t.col === a.col) === b
    );
      return (
        uniqueNodesFromPath.reduce((a, b) => ({ dust: a.dust + b.dust })).dust /
          grid.flat().reduce((a, b) => ({ dust: a.dust + b.dust })).dust *
        100
      );
    };
    const { grid, robot } = config;
    return simulationType === "sweep"
      ? calcSweepingEfficiency(path, grid)
      : calcMappingEfficiency(path, robot.map);
  };

  const [path, runtime] =
    algorithm.name === "User Script"
      ? runInterpreterCalculateRuntime(algorithm, config)
      : runNativeAlgorithmCalculateRuntime(algorithm, config);
  return {
    path,
    runtime,
    efficiency: calculateEfficiency(path, config, simulationType),
  };
};

export const transformScoresToBenchmarkData = (scores) => {
  const calculateAverage = (alg, property) => {
    const flattend = alg.map((row) => row.result[property]);
    return flattend.reduce((a, b) => a + b) / alg.length;
  };

  return scores.map((algGroup) => {
    return {
      name: algGroup[0].algName,
      avgRuntime: parseFloat(calculateAverage(algGroup, "runtime").toFixed(2)),
      avgEfficiency: parseFloat(
        calculateAverage(algGroup, "efficiency").toFixed(2)
      ),
      configs: algGroup.map((alg) => {
        const { result, configName, config } = alg;
        const { grid, availableSteps } = config;
        return {
          config,
          configName,
          dimensions: `${grid.length}X${grid[0].length}`,
          battery: availableSteps,
          runtime: parseFloat(result.runtime.toFixed(2)),
          efficiency: parseFloat(result.efficiency.toFixed(2)),
          path: result.path,
        };
      }),
    };
  });
};

export const checkTimeLimitExceeded = (interpreter) => {
  const start = new Date().getTime();
  while (interpreter.step()) {
    let now = new Date().getTime() - start;
    let secondsPassed = Math.floor((now / 1000) % 60);
    if (secondsPassed === 10) {
      throw new Exception(TIME_LIMIT_EXCEEDED);
    }
  }
};
