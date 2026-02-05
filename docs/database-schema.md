# Database Schema

## Town Database

Uses a flexible indexed JSON pattern for self-evolving data needs.

### town_data table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | TEXT | Record type (e.g., 'conversation', 'project', 'forum_post') |
| index_1 | TEXT | Strategic index (e.g., council_member_id, thread_id) |
| index_2 | TEXT | Strategic index (e.g., citizen_id, project_id) |
| index_3 | TEXT | Strategic index (e.g., status) |
| data | JSONB | Full record data |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Type conventions

- `citizen` - Citizen profiles (index_1: citizen_id)
- `council_member` - Council member data (index_1: member_id)
- `council_state` - Council member online status (index_1: member_id)
- `queue_entry` - Conversation queue (index_1: member_id, index_2: citizen_id, index_3: status)
- `conversation_turn` - Active conversation (index_1: member_id, index_2: citizen_id)
- `conversation_message` - Messages (index_1: turn_id, index_2: role)
- `project` - Project proposals (index_1: status, index_2: proposed_by)
- `project_vote` - Votes/bribes (index_1: project_id, index_2: citizen_id)
- `forum_thread` - Forum threads (index_1: category, index_2: project_id)
- `forum_post` - Forum posts (index_1: thread_id, index_2: author_id)
- `treasury` - Treasury state (singleton, index_1: 'current')
- `donation` - Donations (index_1: citizen_id, index_2: project_id)
