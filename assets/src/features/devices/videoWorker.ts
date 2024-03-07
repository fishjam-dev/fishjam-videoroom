self.onmessage = (event) => {

  if (event.data.action === "start") {
    const loop = () => {
      postMessage(["response"]);
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
};
