# Call Recording & AI Transcription Proposal

## Overview
Add automatic call recording and AI-powered transcription to capture and analyze conversations with leads, enabling better follow-up, training, and compliance.

## Business Value
- **Improved Follow-up**: Review exact conversation details when following up with leads
- **Training & Quality**: Listen to calls to improve team techniques and identify coaching opportunities
- **Compliance**: Maintain records of what was discussed and agreed upon
- **AI Insights**: Extract key information automatically (sentiment, action items, objections)
- **Time Savings**: Auto-generated notes reduce manual note-taking burden

## Technical Approach

### 1. Call Recording (Twilio)
**Implementation**: Use Twilio's built-in call recording
- Enable recording via TwiML `<Record>` verb or Recording API
- Store recordings in Twilio (accessible via API for 90 days by default)
- Option to download and archive to S3/R2 for long-term storage

**Considerations**:
- **Legal compliance**: Two-party consent required in some states
  - Play disclosure message before recording starts
  - Add consent tracking to lead records
- **Storage costs**: ~$0.0025/minute (Twilio storage) + S3/R2 costs for archives
- **Bandwidth**: Recording increases call costs slightly

**TwiML Example**:
```xml
<Response>
  <Say>This call will be recorded for quality and training purposes.</Say>
  <Record 
    action="/api/twilio/recording-complete"
    transcribe="true"
    transcribeCallback="/api/twilio/transcription-complete"
    maxLength="3600"
  />
</Response>
```

### 2. Transcription Options

#### Option A: Twilio Native Transcription
**Pros**:
- Built-in, no additional integration
- Automatic with `transcribe="true"` parameter
- Simple webhook-based delivery

**Cons**:
- Lower accuracy than modern AI models
- No speaker diarization (can't distinguish who said what)
- Limited punctuation/formatting
- English-only (mostly)
- Cost: ~$0.05/minute

#### Option B: AssemblyAI (Recommended)
**Pros**:
- High accuracy (95%+) with latest AI models
- Speaker diarization (identifies who said what)
- Sentiment analysis per speaker
- Auto-chapters and key topics
- Action items and question extraction
- Supports 99+ languages
- Better punctuation and formatting
- Cost: ~$0.015/minute (cheaper than Twilio)

**Cons**:
- Additional service to integrate
- Slightly more complex setup

**AssemblyAI Features**:
```javascript
{
  speaker_labels: true,           // Who said what
  sentiment_analysis: true,       // Positive/negative/neutral per sentence
  auto_chapters: true,            // Automatic conversation segmentation
  entity_detection: true,         // Names, dates, numbers
  iab_categories: true,           // Topic classification
  content_safety: true,           // Detect sensitive content
  summarization: true,            // Auto-generate call summary
  auto_highlights: true           // Key moments
}
```

#### Option C: OpenAI Whisper API
**Pros**:
- Extremely accurate
- Good punctuation
- Multi-language support
- Can use GPT-4 for post-processing

**Cons**:
- No native speaker diarization (requires additional processing)
- Cost: ~$0.006/minute (transcription) + GPT-4 costs for analysis
- More complex pipeline

### 3. Database Schema

```sql
-- Call recordings table
CREATE TABLE call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  phone_id UUID REFERENCES lead_phones(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Twilio data
  call_sid TEXT NOT NULL UNIQUE,
  recording_sid TEXT UNIQUE,
  recording_url TEXT,
  recording_duration INTEGER, -- seconds
  
  -- Recording metadata
  recording_status TEXT, -- in-progress, completed, failed
  consent_given BOOLEAN DEFAULT false,
  consent_recorded_at TIMESTAMPTZ,
  
  -- Archive
  archived_url TEXT, -- S3/R2 URL if archived
  archived_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcriptions table
CREATE TABLE call_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES call_recordings(id) ON DELETE CASCADE,
  
  -- Provider
  provider TEXT NOT NULL, -- 'twilio', 'assemblyai', 'whisper'
  provider_id TEXT, -- External transcription ID
  
  -- Content
  transcript_text TEXT,
  transcript_json JSONB, -- Full structured data with timestamps, speakers, etc.
  
  -- Metadata
  language TEXT,
  confidence FLOAT,
  word_count INTEGER,
  
  -- AI-generated insights
  summary TEXT,
  sentiment TEXT, -- overall: positive, neutral, negative
  topics TEXT[], -- Array of detected topics
  action_items TEXT[], -- Extracted action items
  
  -- Status
  status TEXT NOT NULL, -- queued, processing, completed, failed
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speaker segments (for diarization)
CREATE TABLE transcription_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES call_transcriptions(id) ON DELETE CASCADE,
  
  speaker_label TEXT NOT NULL, -- 'A', 'B', 'Agent', 'Lead'
  start_time FLOAT NOT NULL, -- seconds from call start
  end_time FLOAT NOT NULL,
  text TEXT NOT NULL,
  confidence FLOAT,
  sentiment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_call_recordings_lead_id ON call_recordings(lead_id);
CREATE INDEX idx_call_recordings_user_id ON call_recordings(user_id);
CREATE INDEX idx_call_recordings_created_at ON call_recordings(created_at DESC);
CREATE INDEX idx_transcriptions_recording_id ON call_transcriptions(recording_id);
CREATE INDEX idx_transcription_speakers_transcription_id ON transcription_speakers(transcription_id);
```

### 4. Implementation Flow

```
1. Call Initiated
   ↓
2. Play Disclosure Message
   "This call may be recorded..."
   ↓
3. Start Recording (Twilio)
   - Recording URL stored in DB
   ↓
4. Call Ends
   ↓
5. Webhook: Recording Complete
   - Update DB with recording_sid, duration
   - Download recording from Twilio
   ↓
6. Send to Transcription Service
   - AssemblyAI API call
   - Status: queued → processing
   ↓
7. Webhook: Transcription Complete
   - Store transcript text
   - Store structured JSON (speakers, timestamps)
   - Extract AI insights (summary, sentiment, topics)
   - Status: completed
   ↓
8. Optional: Archive to S3/R2
   - Upload recording file
   - Store archive URL
   - Delete from Twilio after confirmation
```

### 5. UI/UX Changes

#### Lead Detail View
```
┌─────────────────────────────────────────┐
│ Lead: John Smith                        │
│ 123 Main St, Denver, CO 80202          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📞 Call History (3)                 │ │
│ │                                     │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Jan 15, 2026 2:34 PM           │ │ │
│ │ │ Duration: 12:45                 │ │ │
│ │ │ 🔴 Recording | 📝 Transcript    │ │ │
│ │ │                                 │ │ │
│ │ │ Summary: Discussed property    │ │ │
│ │ │ condition, timeline for sale.  │ │ │
│ │ │ Lead interested but needs to   │ │ │
│ │ │ talk to spouse first.          │ │ │
│ │ │                                 │ │ │
│ │ │ ⚡ Action Items:               │ │ │
│ │ │ • Follow up on Friday          │ │ │
│ │ │ • Send comps for neighborhood  │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Transcript Viewer (Modal)
```
┌─────────────────────────────────────────────────┐
│ Call Transcript - Jan 15, 2026 2:34 PM         │
├─────────────────────────────────────────────────┤
│ 🔊 Play Recording                    12:45      │
│ ━━━━━━●──────────────────────────── 4:23 / 12:45│
│                                                 │
│ [Agent] 0:00                                   │
│ Hi John, this is Paul from Rush N Dush. How   │
│ are you doing today?                           │
│                                                 │
│ [Lead] 0:05                                    │
│ I'm doing well, thanks. I got your message    │
│ about the property on Main Street.            │
│                                                 │
│ [Agent] 0:12                                   │
│ Great! Yes, I wanted to follow up on that.    │
│ Can you tell me more about the condition?     │
│                                                 │
│ ... (scrollable transcript)                    │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ 💡 AI Summary                             │  │
│ │ Lead is interested in selling but needs   │  │
│ │ to discuss with spouse. Property needs    │  │
│ │ minor repairs. Timeline: 2-3 months.      │  │
│ │                                           │  │
│ │ 😊 Sentiment: Positive                    │  │
│ │ 🏷️ Topics: Property Condition, Timeline   │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 6. API Endpoints

```typescript
// Start recording (called from TwiML)
POST /api/twilio/voice-client
- Add <Record> to TwiML response

// Recording complete webhook
POST /api/twilio/recording-complete
- Store recording metadata
- Trigger transcription job

// Transcription complete webhook
POST /api/twilio/transcription-complete
- Store transcript
- Extract insights

// Get recordings for lead
GET /api/admin/leads/:leadId/recordings
- Returns list of recordings with transcripts

// Get transcript details
GET /api/admin/recordings/:recordingId/transcript
- Returns full transcript with speaker labels

// Play recording
GET /api/admin/recordings/:recordingId/audio
- Proxy to Twilio or S3 URL with auth
```

### 7. Cost Estimates

**Per Call (10 minute average)**:
- Twilio Recording: ~$0.025 (storage for 90 days)
- AssemblyAI Transcription: ~$0.15
- S3/R2 Archive: ~$0.0001/month (negligible)
- **Total per call: ~$0.18**

**Monthly (100 calls/month)**:
- Recording + Transcription: ~$18/month
- Storage: ~$1/month
- **Total: ~$19/month**

**Yearly (1,200 calls)**:
- ~$216 + storage

### 8. Privacy & Compliance

#### Legal Requirements
- **Two-party consent states**: CA, CT, FL, IL, MD, MA, MT, NH, PA, WA
- Play disclosure: "This call may be recorded for quality and training purposes"
- Store consent acceptance in database
- Provide opt-out mechanism if required

#### Data Retention
- Default: 90 days in Twilio, then archive or delete
- Configurable per user preference
- GDPR/CCPA: Allow users to request deletion

#### Security
- Encrypt recordings at rest (S3/R2 encryption)
- Secure webhook endpoints (verify Twilio signatures)
- RLS policies for database access
- Audio playback requires authentication

### 9. Implementation Phases

#### Phase 1: Basic Recording (1-2 weeks)
- [ ] Add recording to Twilio TwiML
- [ ] Create database schema
- [ ] Store recording metadata
- [ ] Add disclosure message
- [ ] Basic UI to show recording exists

#### Phase 2: Transcription (2-3 weeks)
- [ ] Integrate AssemblyAI
- [ ] Store transcripts in database
- [ ] Build transcript viewer UI
- [ ] Add search functionality

#### Phase 3: AI Insights (1-2 weeks)
- [ ] Extract summaries and action items
- [ ] Sentiment analysis
- [ ] Topic detection
- [ ] Display insights in UI

#### Phase 4: Advanced Features (Optional)
- [ ] Archive to S3/R2
- [ ] Advanced search (search within transcripts)
- [ ] Coaching/training features
- [ ] Analytics dashboard (call duration, sentiment trends)
- [ ] GPT-4 integration for custom insights

### 10. Risks & Mitigation

**Risk**: Legal compliance violations
- **Mitigation**: Implement proper disclosure, consent tracking, and regional opt-out

**Risk**: Storage costs spiral
- **Mitigation**: Automatic cleanup after retention period, archive to cheap storage

**Risk**: Poor transcription accuracy
- **Mitigation**: Use AssemblyAI (95%+ accuracy) vs Twilio native

**Risk**: Privacy breach
- **Mitigation**: Encrypt at rest, secure webhooks, RLS policies, audit logs

## Recommendation

**Start with Phase 1 + 2** to get basic recording and transcription working. AssemblyAI provides the best balance of accuracy, features, and cost.

Estimated effort: **3-5 weeks** for Phases 1-2.

## References
- [Twilio Recording Docs](https://www.twilio.com/docs/voice/tutorials/how-to-record-phone-calls)
- [AssemblyAI API](https://www.assemblyai.com/docs)
- [State Recording Laws](https://www.justia.com/50-state-surveys/recording-phone-calls-and-conversations/)
