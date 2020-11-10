import React, { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

import { withStyles } from "@material-ui/core/styles";

import IconButton from "@material-ui/core/IconButton";
import PowerIcon from "@material-ui/icons/Power";
import Slider from "@material-ui/core/Slider";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";

import GlobalContext from "../../../Context/global-context";

import useStyles, { prettoSliderStyles } from "./BatterySliderStyles";

function ValueLabelComponent({ children, open, value }) {
  return (
    <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>
  );
}

ValueLabelComponent.propTypes = {
  children: PropTypes.element.isRequired,
  open: PropTypes.bool.isRequired,
  value: PropTypes.number.isRequired,
};

const PrettoSlider = withStyles(prettoSliderStyles)(Slider);

export default function CustomizedSlider() {
  const classes = useStyles();
  const context = useContext(GlobalContext);

  const [value, setValue] = useState(
    context.convertAvailableStepsToBatteryCapacity()
  );

  const handleChange = (event, newValue) => {
    if (context.state.isRunning) return;
    setValue(newValue);
  };

  const handleSetBatteryButtonClicked = () => {
    const steps = context.convertBatteryCapacityToAvailableSteps(value);
    context.updateState("availableSteps", steps);
  };

  useEffect(() => {
    const newValue = context.convertAvailableStepsToBatteryCapacity();
    setValue(newValue);
  }, [context]);

  return (
    <div className={classes.root}>
      <Typography gutterBottom>Set Battery</Typography>
      <PrettoSlider
        valueLabelDisplay="auto"
        aria-label="pretto slider"
        value={value}
        onChange={handleChange}
      />
      <IconButton
        color="primary"
        onClick={handleSetBatteryButtonClicked}
        disabled={context.state.isRunning}
      >
        <PowerIcon
          style={{
            fontSize: "32px",
          }}
        />
      </IconButton>
    </div>
  );
}
