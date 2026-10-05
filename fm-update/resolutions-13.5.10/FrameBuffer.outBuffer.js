outBuffer(v2_0, sourceId = null, eventType = null) {
  this.obuffer.push({
    data: v2_0,
    source: sourceId,
    eventType: eventType,
    authorized: this.isSourceAuthorized(sourceId) || eventType && this.alwaysAuthorizedEvents.has(eventType),
    timestamp: Date.now()
  });
}
