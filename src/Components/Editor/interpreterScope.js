import {
  getAllNodes,
  isNeighbors,
  resetGridSearchProperties,
  shuffle,
  isEqual,
  isValidCoordinates,
  getNeighbors,
  getGridDeepCopy,
  fillPathGapsInNodeList,
  adjustRobotPathToBatteryAndInsertReturnPath,
  removeDuplicateNodes,
} from "../../Algorithms/algorithmUtils";
import { astar } from "../../Algorithms/pathfindingAlgorithms";

/*
We are wrapping the functions with INTERPRETER... version because the function is based on inplace modification of it's received parameter,
but modifying variables inplace is not fully supported by the interpreter. 
The interpreter wraps every parameter with another object when sending it to a function in the scope, so the side effect is we must use 
by-value functions only.
The functions which are not by-reference based are exported in their original version.
*/

export const INTERPRETER_resetGridSearchProperties = (grid) => {
  resetGridSearchProperties(grid);
  return grid;
};

export const INTERPRETER_shuffle = (array) => {
  shuffle(array);
  return array;
};

export const INTERPRETER_removeDuplicateNodes = (path) => {
  removeDuplicateNodes(path);
  return path;
};

export const INTERPRETER_fillPathGapsInNodeList = (
  map,
  nodeList,
  visitedNodesInOrder,
  filters
) => {
  fillPathGapsInNodeList(map, nodeList, visitedNodesInOrder, filters);
  return visitedNodesInOrder;
};

export const INTERPRETER_astar = (grid, startNode, finishNode, filters) => {
  return astar(grid, startNode, finishNode, filters, {
    searchPropsResetter: INTERPRETER_resetGridSearchProperties,
  });
};

export const INTERPRETER_adjustRobotPathToBatteryAndInsertReturnPath = (
  visitedNodesInOrder,
  map,
  dockingStation,
  availableSteps
) => {
  return adjustRobotPathToBatteryAndInsertReturnPath(
    visitedNodesInOrder,
    map,
    dockingStation,
    availableSteps,
    INTERPRETER_astar
  );
};

//prettier-ignore
export default [
  {name: getAllNodes.name, func: getAllNodes},
  {name: isNeighbors.name, func: isNeighbors},
  {name: isEqual.name, func: isEqual },
  {name: isValidCoordinates.name, func: isValidCoordinates},
  {name: getNeighbors.name, func: getNeighbors},
  {name: getGridDeepCopy.name, func: getGridDeepCopy},
  {name: shuffle.name, func: INTERPRETER_shuffle},
  {name: adjustRobotPathToBatteryAndInsertReturnPath.name, func: INTERPRETER_adjustRobotPathToBatteryAndInsertReturnPath},
  {name: astar.name, func: INTERPRETER_astar},
  {name: resetGridSearchProperties.name, func: INTERPRETER_resetGridSearchProperties},
  {name: fillPathGapsInNodeList.name, func: INTERPRETER_fillPathGapsInNodeList},
  {name: removeDuplicateNodes.name, func: INTERPRETER_removeDuplicateNodes},
];
