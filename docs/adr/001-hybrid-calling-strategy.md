# ADR-001: Hybrid Calling Strategy for Browser and iOS

## Status

Accepted

## Context

RushNDush supports click-to-call directly from the CRM using Twilio.

Desktop browsers provide a reliable WebRTC experience through the Twilio Voice JavaScript SDK.

During testing, Safari on iOS exhibited platform-specific limitations affecting browser-based calling, including audio routing, browser lifecycle behavior, and reliability when the browser is backgrounded.

These behaviors are inherent to the platform and cannot be completely mitigated within the browser.

## Decision

RushNDush will use a hybrid calling strategy.

### Desktop

Desktop browsers use the Twilio Voice JavaScript SDK as the media endpoint.

### iOS

iOS devices use a bridged PSTN connection.

When an agent taps **Call**:

1. The CRM requests a new outbound call from the backend.
2. Twilio first calls the agent's mobile phone.
3. After the agent answers, Twilio dials the lead.
4. Twilio bridges both call legs.
5. The CRM continues to track the call, recording, notes, transcript, and disposition exactly as it would for a browser-based call.

## Rationale

This approach:

* Uses the most reliable transport available for each platform.
* Preserves a consistent CRM experience.
* Eliminates dependence on Safari acting as the audio endpoint.
* Keeps all business logic, recordings, analytics, and reporting unchanged.

## Consequences

Positive:

* Improved reliability on iOS.
* Native phone audio handling.
* No App Store application required.
* Simplified user experience.

Tradeoffs:

* Two transport mechanisms must be maintained.
* Platform detection is required.
* Call establishment on iOS includes an additional outbound call to the agent before connecting to the lead.

## Future Considerations

The calling layer should remain transport-agnostic so future implementations—such as native iOS, Android, SIP endpoints, or other telephony providers—can be added without changing CRM business logic.

The CRM should treat "browser WebRTC" and "phone bridge" as interchangeable transport implementations behind a common calling interface.
