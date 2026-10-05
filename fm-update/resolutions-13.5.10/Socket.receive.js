receive(v2_0) {
  var v2_1 = this;
  var v2_2 = this.decode(v2_0.data, this.encryption);
  if (v2_2 === null) {
    var v2_3 = this.encryption === "rot13" ? "none" : "rot13";
    v2_2 = this.decode(v2_0.data, v2_3);
    if (v2_2 !== null) {
      this.recoveredFrames = (this.recoveredFrames || 0) + 1;
      if (!this.recoveredWarned) {
        this.recoveredWarned = true;
        if (window.console && console.warn) {
          console.warn("[Socket] Frames are arriving as \"" + v2_3 + "\" while this socket decodes as \"" + this.encryption + "\". Reading them the other way instead of dropping them. Count so far in socket.recoveredFrames.");
        }
      }
    }
  }
  if (v2_2 === null) {
    this.droppedFrames = (this.droppedFrames || 0) + 1;
    console.error("Error parsing socket message: unreadable as rot13 or as plain text");
    return;
  }
  if (!v2_1.firstResponse) {
    v2_1.firstResponse = true;
  }
  // mod: pre-dispatch hooks (ported from 13.4.0 receive)
  // console.log('RECIEVING:')
  // console.log(_0x5b8390)
  // Check if undo history is enabled
  const undoHistoryEnabled = UI?.undoHistoryEnabled;

  // Get current username for consistent use
  // Get current username for consistent use
  const currentUsername = room?.myself?.username;
  const isFromCurrentUser = v2_2?.from === currentUsername || v2_2?.source === currentUsername;

  // SELECTION FIX: Check if this is a selection operation transfer to handle specially
  // SELECTION FIX: Check if this is a selection operation transfer to handle specially
  const isSelectionOperation = v2_2?.selectionOperation === true || v2_2?.uploadType === "selection" || v2_2?.type === "selection";

  // CRITICAL FIX: Create transfer ID earlier for more accurate logging
  // CRITICAL FIX: Create transfer ID earlier for more accurate logging
  let transferId = v2_2.session;
  if (!transferId && v2_2) {
    if (v2_2.command === "IMG") {
      transferId = `img-${v2_2.timestamp || Date.now()}-${v2_2.layer || 0}`;

      // SELECTION FIX: Mark selection operation transfers specially
      if (isSelectionOperation && v2_2.strokeId) {
        transferId = `selection-img-${v2_2.timestamp || Date.now()}-stroke-${v2_2.strokeId}`;
      }
    } else if (v2_2.command === "DIRECT") {
      transferId = `direct-${v2_2.timestamp || Date.now()}-${v2_2.from || ""}-${v2_2.to || ""}`;

      // SELECTION FIX: Mark selection operation transfers specially
      if (isSelectionOperation && v2_2.strokeId) {
        transferId = `selection-direct-${v2_2.timestamp || Date.now()}-stroke-${v2_2.strokeId}`;
      }
    } else if (v2_2.command === "RESPONSE" && v2_2.context?.startsWith("stroke-")) {
      // Create meaningful IDs for stroke response messages
      transferId = `stroke-response-${v2_2.context || Date.now()}`;
    }
  }

  // CRITICAL FIX: More robust check for completion messages
  // CRITICAL FIX: More robust check for completion messages
  const isCompletionMessage = v2_2?.command === "IMG" && v2_2?.action === "COMPLETE" || v2_2?.command === "DIRECT" && v2_2?.action === "APPLY" ||
  // Add more specific pattern matching for completion responses
  v2_2?.command === "RESPONSE" && v2_2?.action === "OK" && v2_2?.context && v2_2?.context.includes("stroke-") ||
  // Additional patterns that might indicate completion
  v2_2?.command === "RESPONSE" && v2_2?.action === "OK" && v2_2?.transferComplete === true;

  // CRITICAL FIX: Check if this is a selection/move message that should be allowed through
  // CRITICAL FIX: Check if this is a selection/move message that should be allowed through
  const isSelectionRelated = v2_2?.type === "selection" || v2_2?.uploadType === "selection" || v2_2?.action === "COMPLETE" && transferId && transferId.includes("selection") || v2_2?.source === "selection" || v2_2?.selectionId != null || isSelectionOperation;
  // CRITICAL FIX 1: Pre-filter check - immediately drop own IMG/DIRECT messages with undo history
  // BUT allow selection-related messages and completion messages
  // CRITICAL FIX 1: Pre-filter check - immediately drop own IMG/DIRECT messages with undo history
  // BUT allow selection-related messages and completion messages
  if (isFromCurrentUser && (v2_2.command === "IMG" || v2_2.command === "DIRECT")) {
    if (undoHistoryEnabled) {
      // When undo history is enabled
      if (true) {
        return; // Drop our own transfer messages
      }
    } else
      // When undo history is disabled
      if (!isSelectionRelated && !isCompletionMessage && room?.board?.needToUnblockMessagesWhenComplete === true) {
        return; // Drop our own transfer messages
      }
  }

  // SELECTION FIX: Start tracking preparation messages for selection operations
  // SELECTION FIX: Start tracking preparation messages for selection operations
  if (isSelectionOperation && (v2_2.command === "IMG" && v2_2.action === "PREPARE" || v2_2.command === "DIRECT" && v2_2.action === "PREPARE")) {
    // Initialize selection transfers tracking if needed
    if (!this.selectionTransfers) {
      this.selectionTransfers = new Map();
    }

    // Generate a tracking ID
    const strokeId = v2_2.strokeId || (v2_2.context ? parseInt(v2_2.context.match(/stroke-(\d+)/)?.[1]) : null);
    if (strokeId) {
      const selectionTransferId = `selection-stroke-${strokeId}`;
      this.selectionTransfers.set(selectionTransferId, {
        startTime: Date.now(),
        strokeId: strokeId,
        transferId: transferId,
        expectedChunks: v2_2.totalChunks || v2_2.parts || 0,
        receivedChunks: 0,
        isCompleted: false,
        manuallyCompleted: false,
        lastActivity: Date.now()
      });

      // Store reference on message for future chunk tracking
      v2_2._selectionTransferId = selectionTransferId;
    }
  }

  // CRITICAL FIX: Better handling for completion messages
  // CRITICAL FIX: Better handling for completion messages
  if (isCompletionMessage) {
    // Extract stroke ID from context field if present (for RESPONSE messages)
    if (v2_2?.context) {
      const contextMatch = v2_2.context.match(/stroke-(\d+)/);
      if (contextMatch && contextMatch[1]) {
        const strokeId = parseInt(contextMatch[1]);
        if (!isNaN(strokeId)) {
          // Create a synthetic transfer ID for stroke completion
          transferId = `stroke-${strokeId}-complete`;

          // SELECTION FIX: Mark the selection transfer as manually completed
          if (this.selectionTransfers) {
            const selectionTransferId = `selection-stroke-${strokeId}`;
            const transferInfo = this.selectionTransfers.get(selectionTransferId);
            if (transferInfo) {
              transferInfo.manuallyCompleted = true;
              transferInfo.lastActivity = Date.now();

              // Check if we should process completion now or wait
              const chunksStillInProgress = transferInfo.receivedChunks < transferInfo.expectedChunks;
              const hasRecentActivity = Date.now() - transferInfo.lastActivity < 1000;
              if (chunksStillInProgress && hasRecentActivity) {
                // Save this message for later processing
                transferInfo.pendingCompletionMessage = v2_2;

                // Schedule a check to force completion if chunks stop coming
                if (!transferInfo.completionTimeout) {
                  transferInfo.completionTimeout = setTimeout(() => {
                    this.checkSelectionTransferCompletion(selectionTransferId);
                  }, 3000);
                }

                // Set a flag to skip normal completion processing
                v2_2._skipCompletionProcessing = true;
              }
            }
          }
        }
      }
    }

    // Only log and flag if we're not skipping completion
    if (!v2_2._skipCompletionProcessing) {
      // Set a flag to indicate this message is a completion
      v2_2._isCompletionMessage = true;
    }
  }

  // Handle transfer tracking for non-filtered messages
  // Handle transfer tracking for non-filtered messages
  if (v2_2 && typeof v2_2 === "object") {
    // Detect chunk-based transfers (IMG PARTIAL or DIRECT PARTIALNEXT)
    const isTransferChunk = v2_2.command === "IMG" && v2_2.action === "PARTIAL" || v2_2.command === "DIRECT" && v2_2.action === "PARTIALNEXT";

    // Detect start of transfer preparation phase
    const isTransferPrep = v2_2.command === "IMG" && v2_2.action === "PREPARE" || v2_2.command === "DIRECT" && v2_2.action === "PREPARE";

    // Track non-local transfers or transfers that made it past filtering
    if (!isFromCurrentUser || !undoHistoryEnabled || isSelectionRelated || isCompletionMessage) {
      // Always track the first chunk of any transfer as a starting point
      if (isTransferChunk) {
        // For IMG transfers, part 0 indicates the first chunk
        const isFirstChunk = v2_2.command === "IMG" ? v2_2.part === 0 : false;

        // For tracking chunks in progress
        if (transferId) {
          // Get or initialize chunk count
          if (!this.transferChunksInProgress) {
            this.transferChunksInProgress = new Map();
          }
          let chunkCount = this.transferChunksInProgress.get(transferId) || 0;

          // First chunk or prep phase - consider this a new transfer
          if (isFirstChunk || isTransferPrep || chunkCount === 0) {
            if (!this.activeTransfers) {
              this.activeTransfers = new Set();
            }
            this.activeTransfers.add(transferId);
            chunkCount = 1;
          } else {
            // Increment chunk count
            chunkCount++;
          }
          this.transferChunksInProgress.set(transferId, chunkCount);

          // SELECTION FIX: Update the selection transfer tracking if applicable
          const strokeId = v2_2.strokeId || (v2_2.context ? parseInt(v2_2.context.match(/stroke-(\d+)/)?.[1]) : null);
          if (isSelectionOperation && strokeId && this.selectionTransfers) {
            const selectionTransferId = `selection-stroke-${strokeId}`;
            const transferInfo = this.selectionTransfers.get(selectionTransferId);
            if (transferInfo) {
              transferInfo.receivedChunks++;
              transferInfo.lastActivity = Date.now();

              // Check if this transfer was previously marked as completed but was waiting for chunks
              if (transferInfo.manuallyCompleted && transferInfo.receivedChunks >= transferInfo.expectedChunks) {
                this.checkSelectionTransferCompletion(selectionTransferId);
              }
            }
          }
        }
      }

      // CRITICAL FIX: More robust completion detection
      if (!v2_2._skipCompletionProcessing && (v2_2._isCompletionMessage || isCompletionMessage) && transferId) {
        // CRITICAL FIX: Extract stroke ID from transferId or context if available
        let associatedStrokeId = null;

        // Try to extract stroke ID from context
        if (v2_2.context && v2_2.context.includes("stroke-")) {
          const contextMatch = v2_2.context.match(/stroke-(\d+)/);
          if (contextMatch && contextMatch[1]) {
            associatedStrokeId = parseInt(contextMatch[1]);
          }
        }

        // If not found in context, check transfer ID
        if (!associatedStrokeId && transferId.includes("stroke-")) {
          const transferMatch = transferId.match(/stroke-(\d+)/);
          if (transferMatch && transferMatch[1]) {
            associatedStrokeId = parseInt(transferMatch[1]);
          }
        }

        // Also check if strokeId is directly in the message
        if (!associatedStrokeId && v2_2.strokeId) {
          associatedStrokeId = parseInt(v2_2.strokeId);
        }

        // Notify the board of transfer completion
        if (room?.board?.handleTransferComplete) {
          room.board.handleTransferComplete(transferId, {
            command: v2_2.command,
            action: v2_2.action,
            context: v2_2.context,
            strokeId: associatedStrokeId,
            timestamp: Date.now()
          });
        }

        // Clean up transfer tracking
        if (this.activeTransfers) {
          this.activeTransfers.delete(transferId);
        }
        if (this.transferChunksInProgress) {
          this.transferChunksInProgress.delete(transferId);
        }

        // CRITICAL FIX: Trigger multiple event variants to ensure handlers catch it
        if (associatedStrokeId) {
          // Trigger stroke-specific completion event

          // Trigger standard transferComplete event
          $(document).trigger("transferComplete", {
            strokeId: associatedStrokeId,
            timestamp: Date.now(),
            originalTimestamp: v2_2.timestamp,
            totalLayers: 1,
            details: v2_2,
            triggerMethod: "context-detection"
          });

          // Also trigger with stroke-specific namespace
          $(document).trigger(`transferComplete.stroke-${associatedStrokeId}`, {
            strokeId: associatedStrokeId,
            timestamp: Date.now(),
            details: v2_2
          });

          // And trigger strokeComplete event for alternative handlers
          $(document).trigger("strokeComplete", {
            strokeId: associatedStrokeId,
            timestamp: Date.now()
          });

          // SELECTION FIX: Clean up selection transfer tracking if applicable
          if (this.selectionTransfers) {
            const selectionTransferId = `selection-stroke-${associatedStrokeId}`;
            if (this.selectionTransfers.has(selectionTransferId)) {
              const transferInfo = this.selectionTransfers.get(selectionTransferId);

              // Clear any pending timeout
              if (transferInfo.completionTimeout) {
                clearTimeout(transferInfo.completionTimeout);
              }

              // Remove from tracking
              this.selectionTransfers.delete(selectionTransferId);
            }
          }
        } else {
          // Trigger generic completion event

          $(document).trigger("transferComplete", {
            transferId: transferId,
            timestamp: Date.now(),
            details: v2_2,
            triggerMethod: "general-completion"
          });
        }

        // NEW: Special handling for move/clone operations
        // If this is a RESPONSE message with OK status and stroke- context,
        // it's very likely related to a move/clone operation
        if (v2_2.command === "RESPONSE" && v2_2.action === "OK" && v2_2.context && v2_2.context.includes("stroke-")) {
          // Force trigger an event for any stroke handlers
          $(document).trigger("globalStrokeComplete", {
            message: v2_2,
            transferId: transferId,
            timestamp: Date.now()
          });
        }
      }
    }
  }
  if (!UserStateManager.userPositions.size) {
    // Start the periodic average speed detection interval
    setInterval(() => {
      const currentTime = Date.now();

      // Convenient configuration variables
      const detectTrolling = localStorage.getItem("detectTrolling") === "true";
      const GRIEF_SPEED_THRESHOLD = 25000; // pixels per second threshold
      const SAFE_SPEED_THRESHOLD = 15000;
      const SPEED_WINDOW = 40; // window in milliseconds over which to compute average speed
      const IDLE_TIMEOUT = 10000; // ms threshold to consider user stopped drawing

      // Process each user's speedHistory
      UserStateManager.speedHistory.forEach((records, user) => {
        // Clean up old records
        UserStateManager.cleanSpeedHistory(user, currentTime);

        // Sum the distances in the last SPEED_WINDOW
        const totalDistance = records.reduce((sum, rec) => sum + rec.distance, 0);
        // Compute average speed: totalDistance / (SPEED_WINDOW in seconds)
        const avgSpeed = totalDistance / (SPEED_WINDOW / 1000);

        // Log current average speed.
        // console.log(`[${new Date().toLocaleTimeString()}] ${user}: Avg Speed ${avgSpeed.toFixed(2)} pixels/second`);

        // Determine if user is drawing (pen down and recent records exist)
        const isDrawing = records.length > 0 && UserStateManager.penStates.get(user) === true;
        if (isDrawing) {
          UserStateManager.lastDrawTime.set(user, currentTime);
        }
        if (detectTrolling) {
          if (isDrawing && avgSpeed > GRIEF_SPEED_THRESHOLD) {
            const userObj = Object.values(room.users).find(u => u.username === user);
            if (!userObj) {
              return;
            }
            // Only apply WU rank to users who have RU or UU rank
            if (!UserStateManager.originalRanks.has(user) && (userObj.rank === "RU" || userObj.rank === "UU")) {
              UserStateManager.originalRanks.set(user, userObj.rank);
              userObj.changeRank("WU");
              const trollSound = localStorage.getItem(config.localStorageKeys.trollSound) || "nosound";
              UI?.soundSystem?.play(trollSound);
            }
          }
          if (UserStateManager.originalRanks.has(user)) {
            if (!UserStateManager.slowStartTime) {
              UserStateManager.slowStartTime = new Map();
            }
            const slowStart = UserStateManager.slowStartTime.get(user) || 0;

            // Track time spent under safe speed, regardless of pen state
            if (avgSpeed < SAFE_SPEED_THRESHOLD) {
              if (!slowStart) {
                // Mark the start of safe-drawing
                UserStateManager.slowStartTime.set(user, currentTime);
              } else if (currentTime - slowStart >= IDLE_TIMEOUT) {
                // If they've been under threshold for long enough, revert rank
                const userObj = Object.values(room.users).find(u => u.username === user);
                if (userObj) {
                  userObj.changeRank(UserStateManager.originalRanks.get(user) || userObj.rank);
                  UserStateManager.originalRanks.delete(user);
                  UserStateManager.lastDrawTime.delete(user);
                }
                UserStateManager.slowStartTime.delete(user);
              }
            } else
              // Reset if they're back above safe speed
              if (slowStart) {
                UserStateManager.slowStartTime.delete(user);
              }

            // Also revert if user is fully idle for IDLE_TIMEOUT
            const lastActive = UserStateManager.lastDrawTime.get(user) || 0;
            const idleTime = currentTime - lastActive;
            if (!isDrawing && idleTime >= IDLE_TIMEOUT) {
              const userObj = Object.values(room.users).find(u => u.username === user);
              if (userObj) {
                userObj.changeRank(UserStateManager.originalRanks.get(user) || userObj.rank);
                UserStateManager.originalRanks.delete(user);
                UserStateManager.lastDrawTime.delete(user);
              }
            }
          }
        }
      });
    }, 200); // Interval for checking average speed
  }

  // Check broadcast for pen state and new positions
  // Check broadcast for pen state and new positions
  if (v2_2.command === "BC" || v2_2.command === "BROADCAST") {
    const user = v2_2.from;
    if (v2_2.action === "Pd") {
      UserStateManager.setPenState(user, true);
    } else if (v2_2.action === "Pu") {
      UserStateManager.setPenState(user, false);
    }
    if (v2_2.x && v2_2.y) {
      const newPos = {
        x: v2_2.x,
        y: v2_2.y,
        time: Date.now()
      };
      UserStateManager.updatePosition(user, newPos);
    }
  }
  this.commandRegistry.execute(v2_2);
}
