import { Button, Paper, TextField, Typography } from "@mui/material";
import React, { useState, useEffect } from "react";

type controller = {
  left_stick_x: number;
  left_stick_y: number;
  right_stick_x: number;
  right_stick_y: number;
  dpad_up: boolean;
  dpad_down: boolean;
  dpad_left: boolean;
  dpad_right: boolean;
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  guide: boolean;
  start: boolean;
  back: boolean;
  left_bumper: boolean;
  right_bumper: boolean;
  left_stick_button: boolean;
  right_stick_button: boolean;
  left_trigger: number;
  right_trigger: number;
};
type controllers = {
  type: "RECEIVE_GAMEPAD_STATE";
  gamepad1: controller;
  gamepad2: controller;
};

function controllerFromGamepad(gamepad: Gamepad) {
  return {
    left_stick_x: gamepad.axes[0],
    left_stick_y: gamepad.axes[1],
    right_stick_x: gamepad.axes[2],
    right_stick_y: gamepad.axes[3],
    dpad_up: gamepad.buttons[12].pressed,
    dpad_down: gamepad.buttons[13].pressed,
    dpad_left: gamepad.buttons[14].pressed,
    dpad_right: gamepad.buttons[15].pressed,
    a: gamepad.buttons[0].pressed,
    b: gamepad.buttons[1].pressed,
    x: gamepad.buttons[2].pressed,
    y: gamepad.buttons[3].pressed,
    guide: gamepad.buttons[16].pressed,
    start: gamepad.buttons[9].pressed,
    back: gamepad.buttons[8].pressed,
    left_bumper: gamepad.buttons[4].pressed,
    right_bumper: gamepad.buttons[5].pressed,
    left_stick_button: gamepad.buttons[10].pressed,
    right_stick_button: gamepad.buttons[11].pressed,
    left_trigger: gamepad.buttons[6].pressed ? 1 : 0,
    right_trigger: gamepad.buttons[7].pressed ? 1 : 0,
  } as controller;
}

const Proxy = () => {
  const [gamepad1, setGamepad1] = useState<number | null>(null);
  const [gamepad2, setGamepad2] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState(111111);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState(false);
  const [watcherCount, setWatcherCount] = useState<number | null>(null);

  useEffect(() => {
    const removeGamepad = (e: GamepadEventInit) => {
      if (gamepad1 === e.gamepad.index) {
        setGamepad1(null);
      } else if (gamepad2 === e.gamepad.index) {
        setGamepad2(null);
      }
    };
    window.addEventListener("gamepaddisconnected", removeGamepad, false);
    return () => {
      window.removeEventListener("gamepaddisconnected", removeGamepad, false);
    };
  }, [gamepad1, gamepad2]);

  useEffect(() => {
    const interval = setInterval(() => {
      Object.values(navigator.getGamepads()).forEach((gamepad) => {
        if (gamepad) {
          if (gamepad.buttons[9].pressed && gamepad.buttons[0].pressed) {
            if (gamepad.index === gamepad2) {
              setGamepad2(null);
            }
            setGamepad1(gamepad.index);
          } else if (gamepad.buttons[9].pressed && gamepad.buttons[1].pressed) {
            if (gamepad.index === gamepad1) {
              setGamepad1(null);
            }
            setGamepad2(gamepad.index);
          } else {
            var tempController1 = {
                left_stick_x: 0,
                left_stick_y: 0,
                right_stick_x: 0,
                right_stick_y: 0,
                dpad_up: false,
                dpad_down: false,
                dpad_left: false,
                dpad_right: false,
                a: false,
                b: false,
                x: false,
                y: false,
                guide: false,
                start: false,
                back: false,
                left_bumper: false,
                right_bumper: false,
                left_stick_button: false,
                right_stick_button: false,
                left_trigger: 0,
                right_trigger: 0,
              } as controller,
              tempController2 = tempController1;
            if (gamepad.index === gamepad1) {
              tempController1 = controllerFromGamepad(gamepad);
            } else if (gamepad.index === gamepad2) {
              tempController2 = controllerFromGamepad(gamepad);
            }
            const controllersPacket: controllers = {
              type: "RECEIVE_GAMEPAD_STATE",
              gamepad1: tempController1,
              gamepad2: tempController2,
            };
            if (ws?.readyState === WebSocket.OPEN) {
              ws!.send(JSON.stringify(controllersPacket));
            }
          }
        }
      });
    }, 10);
    return () => {
      clearInterval(interval);
    };
  }, [gamepad1, gamepad2, ws]);

  useEffect(() => {
    const ws = new WebSocket(
      `${
        process.env.NODE_ENV === "production"
          ? "wss://remoteftc-api.lavallee.one"
          : "ws://localhost:4000"
      }/custom`
    );
    ws.addEventListener("open", () => {
      setWsStatus(true);
    });
    ws.addEventListener("message", function (event) {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "watcherCount":
          setWatcherCount(data.value);
          break;
        case "RECEIVE_ROBOT_STATUS":
          console.log(data);
          break;
        default:
          break;
      }
    });
    setWs(ws);
    return () => {
      ws.close();
      setWs(null);
      setWsStatus(false);
    };
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    ws?.send(JSON.stringify({ type: "joinroom", roomcode: roomCode }));
  }

  return (
    <div>
      <Paper sx={{ ml: 10, mr: 10, p: 1 }}>
        {!watcherCount ? (
          <form onSubmit={onSubmit}>
            <TextField
              label="Room Code"
              required
              disabled={!wsStatus}
              type="number"
              value={roomCode}
              error={roomCode.toString().length !== 6}
              helperText={
                roomCode.toString().length !== 6 && "Must Be Exactly 6 Digits"
              }
              onChange={(e) => setRoomCode(parseInt(e.target.value, 10))}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ m: 1 }}
              disabled={!wsStatus}
            >
              Submit
            </Button>
          </form>
        ) : (
          <>
            <Typography>Watch Count: {watcherCount}</Typography>
            <Typography>
              {`Gamepad1: ${
                Object.values(navigator.getGamepads()).find(
                  (gamepad) => gamepad?.index === gamepad1
                )?.id || "Gamepad 1 Not Connected"
              }`}
            </Typography>
            <Typography>
              {`Gamepad2: ${
                Object.values(navigator.getGamepads()).find(
                  (gamepad) => gamepad?.index === gamepad2
                )?.id || "Gamepad 2 Not Connected"
              }`}
            </Typography>
          </>
        )}
      </Paper>
    </div>
  );
};

export default Proxy;
