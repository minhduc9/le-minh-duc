# Live Scoreboard API Module - Technical Specification

## Overview

This module provides a real-time scoreboard system that displays the top 10 users by score. The system prevents unauthorized score manipulation through multi-layered authentication and validation while broadcasting live updates to all connected clients via WebSocket.

## Requirements Summary

1. Display top 10 user scores on a website scoreboard
2. Provide live updates to all connected clients when scores change
3. Allow users to complete actions that increase their scores
4. Prevent malicious users from fraudulently increasing scores

## System Architecture

### Components

- **API Gateway**: Entry point for all HTTP requests
- **Auth Service**: Handles JWT token validation
- **Score Service**: Core business logic for score updates and validation
- **Database**: Persistent storage for user scores
- **Redis**: Caching layer and pub/sub for real-time updates
- **WebSocket Server**: Manages persistent connections and broadcasts updates to clients

### Diagrams

Two sequence diagrams are provided to illustrate the system flow:

1. **diagram/scoreboard-api-sequence.puml**: Complete score update flow with security validation
2. **websocket-live-updates.puml**: WebSocket connection management and live update broadcasting

## How It Works

### Phase 1: Action Initiation

When a user starts an action that will increase their score:

1. Client sends request to initiate action
2. API Gateway validates the user's JWT token via Auth Service
3. Score Service generates a single-use action token containing:
   - User ID
   - Action ID
   - Creation timestamp
   - Expiration time (60 seconds)
4. Action token is stored in Redis with 60-second expiration
5. Action token is returned to client

**Purpose**: This establishes that the user has legitimately started an action and provides a time-limited token to prove completion.

### Phase 2: Score Update with Multi-Layer Validation

When the user completes the action and requests score update:

1. Client sends score update request with action token
2. API Gateway validates JWT to confirm user identity
3. Score Service performs multiple security checks:

   **Rate Limiting**:

   - Increment per-user rate counter in Redis
   - Check if user exceeds allowed requests per minute
   - Reject with if limit exceeded

   **Action Token Validation**:

   - Retrieve action token from Redis by action ID
   - Verify token exists and hasn't expired
   - Verify token hasn't been used (checking Redis)
   - Verify user ID in token matches authenticated user
   - Return if any validation fails

   **Server-Side Action Verification**:

   - Score Service independently verifies the action was actually completed
   - This prevents clients from claiming completion without doing the work
   - Return if action not completed

4. If all validations pass:

   - Delete action token from Redis (mark as used)
   - Update user score in Database with optimistic locking (version increment)
   - Update leaderboard ranking in Redis sorted set (ZADD)
   - Publish update event to Redis pub/sub channel
   - Return success response to client with new score and rank

5. WebSocket Server receives pub/sub notification and broadcasts update to all connected clients

**Security Layers**:

- **Authentication**: JWT ensures user identity
- **Authorization**: Action token proves legitimate action completion
- **Single-use**: Token deletion prevents replay attacks
- **Rate limiting**: Prevents flooding
- **Server verification**: Prevents client-side manipulation
- **Time limitation**: 60-second token expiry reduces attack window

### Phase 3: WebSocket Live Updates

**Connection Establishment**:

1. Client connects to WebSocket endpoint
2. WebSocket Server validates JWT (optional but recommended)
3. Connection established
4. Server sends initial leaderboard snapshot (top 10) to newly connected client
5. WebSocket Server maintains this client in active connection pool

**Live Broadcasting**:

1. When Score Service publishes update to Redis pub/sub, WebSocket Server receives event
2. Server applies debouncing to batch rapid updates
3. Server processes differential update (only changed positions)
4. Server broadcasts to all connected clients in parallel
5. Clients receive only the changes, not full leaderboard (optimization)

**Connection Health Monitoring**:

1. WebSocket Server sends PING to all clients every 30 seconds
2. Clients must respond with PONG within 10 seconds
3. If timeout occurs, server closes connection and removes from pool
4. This prevents resource exhaustion from dead connections

**Reconnection**:

- Clients can reconnect anytime
- Upon reconnection, they receive current leaderboard state immediately

## Key Design Decisions

### Why Two-Phase Token System?

- **Problem**: Need to prevent clients from arbitrarily claiming score increases
- **Solution**: Separate action initiation (generates token) from completion (consumes token)
- **Benefit**: Server controls when valid score opportunities exist

### Why Redis for Action Tokens?

- **Fast validation**: In-memory lookup vs database query
- **Automatic expiration**: Built-in TTL removes stale tokens
- **Atomic operations**: INCR for rate limiting, DEL for single-use enforcement

### Why Redis Pub/Sub for Broadcasting?

- **Scalability**: Multiple WebSocket Server instances can subscribe to same channel
- **Decoupling**: Score Service doesn't need to know about connected clients
- **Fan-out**: Single publish reaches all WebSocket servers

### Why Optimistic Locking?

- **Problem**: Concurrent score updates could cause race conditions
- **Solution**: Version field in database, update only if version matches
- **Benefit**: Prevents lost updates without pessimistic locks

### Why Differential Updates?

- **Problem**: Broadcasting full top-10 list for every change wastes bandwidth
- **Solution**: Send only changed rankings
- **Benefit**: Reduces network traffic, especially important for mobile clients

### Why Debouncing?

- **Problem**: Rapid successive updates could overwhelm clients
- **Solution**: Wait up to 500ms to batch updates before broadcasting
- **Benefit**: Reduces update frequency while maintaining near-real-time feel

## Suggested Improvements

### 1. Server-Side Action Verification Detail

**Issue**: Specification states "verify action completion" but doesn't define how  
**Recommendation**: Define verification mechanism (e.g., action service callback, event log check, state machine validation)  
**Benefit**: Clear implementation contract between Score Service and action system

### 2. Leaderboard Tie Handling

**Issue**: No specification for equal scores  
**Recommendation**: Define tie-breaking rules (timestamp, user ID, etc.)  
**Benefit**: Consistent ranking behavior

### 3. Score Rollback Mechanism

**Issue**: No provision for fraudulent score reversal  
**Recommendation**: Add administrative API to reduce scores with audit trail  
**Benefit**: Recovery from detected fraud or bugs

### 4. WebSocket Scalability

**Issue**: Single WebSocket server is single point of failure  
**Recommendation**: Document load balancer requirements (sticky sessions or shared state)  
**Benefit**: Horizontal scaling plan

### 5. Historical Leaderboard

**Issue**: Only current state maintained  
**Recommendation**: Periodic snapshots for analytics and user engagement  
**Benefit**: Track progress, enable time-based competitions

### 6. Grace Period for Network Issues

**Issue**: 10-second PONG timeout may be harsh for poor connections  
**Recommendation**: Implement exponential backoff or allow missed heartbeats  
**Benefit**: Better mobile/unstable network support

### 7. Action Score Value Validation

**Issue**: Specification doesn't define score increment amounts  
**Recommendation**: Define expected score values per action type, validate on server  
**Benefit**: Detect modified client requests

### 8. Database Partitioning Strategy

**Issue**: Single user_scores table will grow indefinitely  
**Recommendation**: Define archival strategy for inactive users  
**Benefit**: Maintain query performance at scale

## Implementation Checklist

### Backend Engineering Team Must Implement

- JWT validation middleware in API Gateway
- Action token generation with cryptographic signatures
- Rate limiting using Redis counters
- Action token validation (exist, not-expired, not-used, user-match)
- Server-side action completion verification
- Database transaction for score update with optimistic locking
- Redis sorted set management for leaderboard
- Redis pub/sub publisher in Score Service
- WebSocket server with JWT authentication
- WebSocket connection pooling
- Redis pub/sub subscriber in WebSocket server
- Heartbeat mechanism (PING/PONG with timeout)
- Differential update calculation
- Debouncing logic for broadcasts
- Error handling for all validation failures
- Logging for security events

### Required Infrastructure

- Redis cluster with pub/sub support
- Database with transaction support
- Load balancer with WebSocket support (if multi-instance)
- SSL/TLS certificates for secure connections

## Testing Requirements

- Security testing: Attempt replay attacks, token reuse, user ID spoofing
- Load testing: Concurrent users, rapid score updates, many WebSocket connections
- Resilience testing: Database failures, Redis failures, WebSocket disconnections
- Race condition testing: Simultaneous score updates for same user
