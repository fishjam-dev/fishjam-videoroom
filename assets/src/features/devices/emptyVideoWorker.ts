let requestId: number | null = null;
let ctx: any | null = null;

self.onmessage = (event) => {
  if (event.data.action === "init") {
    const canvasElement = event.data.canvas;

    canvasElement.width = 1280;
    canvasElement.height = 720;

    ctx = canvasElement.getContext("2d");
    if (!ctx) throw "ctx is null";

    const draw = (_time: DOMHighResTimeStamp) => {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 1280, 720);

      requestId = requestAnimationFrame(draw);
    };

    requestId = requestAnimationFrame(draw);
  } else if (event.data.action === "stop") {
    if (requestId) {
      cancelAnimationFrame(requestId);
    }
  } else if (event.data.action === "start") {
    const draw = (_time: DOMHighResTimeStamp) => {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 1280, 720);

      requestId = requestAnimationFrame(draw);
    };

    requestId = requestAnimationFrame(draw);
  }
};
