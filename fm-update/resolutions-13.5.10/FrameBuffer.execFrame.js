execFrame() {
  if (bypassDenied101) {
    // Throttled version with authorization
    const now = Date.now();
    if (now - this.lastIntervalTime >= 100) {
      this.lastIntervalTime = now;
      this.sendCounts[this.intervalIndex] = this.currentIntervalCount;
      this.intervalIndex = (this.intervalIndex + 1) % 10;
      this.currentIntervalCount = 0;
      this.isThrottled = this.sendCounts.reduce((sum, count) => sum + count, 0) > this.maxSendsPerSecond;
    }
    const maxSendsThisFrame = this.isThrottled ? this.maxSendsPerSecond / 2 : this.maxSendsPerSecond;
    let sendsThisFrame = 0;
    let blockedCount = 0;
    while (this.obuffer.length > 0 && sendsThisFrame < maxSendsThisFrame) {
      const event = this.obuffer.shift();
      if (event.authorized || !this.defaultBlockMessages) {
        socket.send(event.data);
        sendsThisFrame++;
        this.currentIntervalCount++;
      } else {
        blockedCount++;
      }
    }
  } else
    // Non-throttled version with authorization
    if (this.obuffer.length > 0) {
      let v3_0 = "";
      let v3_1 = "";
      let authorizedEvents = [];
      while (this.obuffer.length > 0) {
        const event = this.obuffer.shift();
        if (event.authorized || !this.defaultBlockMessages) {
          authorizedEvents.push(event.data);
        }
      }
      if (authorizedEvents.length > 0) {
        for (let i = 0; i < authorizedEvents.length; i++) {
          v3_0 += v3_1 + authorizedEvents[i];
          v3_1 = "\t";
        }
        socket.send(v3_0);
      }
    }

  // Process input buffer (common for both versions)
  while (this.buffer.length > 0) {
    var v2_0 = this.buffer.shift();
    if (this.deferDrawing && this.isDrawingCommand(v2_0.action)) {
      this.deferredBuffer.push(v2_0);
    } else {
      try {
        this.netcode.execFrame(v2_0);
      } catch (v6_0) {}
    }
  }
}
