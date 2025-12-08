const canvas = document.getElementById("road");
const ctx = canvas.getContext("2d");

let cars = [];
let light = "GREEN";

const ws = new WebSocket("ws://localhost:3000");

function spawnCar() {
  cars.push({ x: 0, y: 180, speed: 2 });
}

setInterval(spawnCar, 1200);

// blockchain updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  light = data.status || "GREEN";
};

function drawLight() {
  ctx.fillStyle = light === "GREEN" ? "lime" : (light === "RED" ? "red" : "yellow");
  ctx.beginPath();
  ctx.arc(700, 100, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawCars() {
  cars.forEach((car, i) => {
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(car.x, car.y, 30, 15);

    if (light === "GREEN") {
      car.x += car.speed;
    }

    if (car.x > 800) cars.splice(i, 1);
  });
}

function drawRoad() {
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, 170, 800, 60);
}

function loop() {
  ctx.clearRect(0, 0, 800, 400);
  drawRoad();
  drawLight();
  drawCars();
  requestAnimationFrame(loop);
}

loop();
