let intervalId: number;

self.onmessage = (event) => {
  if (event.data.type === "start") {
    intervalId = self.setInterval(animationLoop, 1_000 / event.data.fps);
  } else if (event.data.type === "stop") {
    self.clearInterval(intervalId);
  }
};

self.onclose = () => {
  self.clearInterval(intervalId);
}

function animationLoop() {
  self.postMessage("tick");
}
