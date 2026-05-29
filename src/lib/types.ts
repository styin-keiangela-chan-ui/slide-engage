// ── Database types matching schema.sql ──

export type EventStatus = 'draft' | 'live' | 'closed' | 'archived';
export type InteractionType = 'poll' | 'quiz' | 'qa' | 'word_cloud' | 'feedback';
export type ShowResults = 'after_voting' | 'after_close' | 'never';

export interface Lecturer {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Event {
  id: string;
  lecturer_id: string;
  event_code: string;
  event_name: string;
  status: EventStatus;
  allow_anonymous: boolean;
  show_results: ShowResults;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventCollaborator {
  id: string;
  event_id: string;
  user_id: string;
  role: string;
  can_manage_interactions: boolean;
  can_view_results: boolean;
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  session_token: string;
  display_name: string;
  joined_at: string;
}

export interface InteractionConfig {
  time_limit_seconds?: number;
  max_words_per_participant?: number;
  allow_multiple_answers?: boolean;
  allow_anonymous_questions?: boolean;
  allow_duplicate_words?: boolean;
  anonymous_mode?: boolean;
  character_limit?: number;
  downvotes_enabled?: boolean;
  labels_enabled?: boolean;
  moderation_enabled?: boolean;
  paragraph_answer?: boolean;
  poll_description_enabled?: boolean;
  poll_kind?: string;
  replies_enabled?: boolean;
  results_visible?: boolean;
  show_respondent_names?: boolean;
  ai_auto_answer_enabled?: boolean;
  include_star_ratings?: boolean;
  include_open_text?: boolean;
  max_scale?: number;
  rating_mode?: 'star' | 'emoji' | 'number' | string;
  upvotes_enabled?: boolean;
  voting_enabled?: boolean;
  category_tags?: boolean;
  points?: number;
  leaderboard?: boolean;
}

export interface Interaction {
  id: string;
  event_id: string;
  type: InteractionType;
  title: string;
  status: EventStatus;
  config: InteractionConfig;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface InteractionOption {
  id: string;
  interaction_id: string;
  option_text: string;
  option_letter: string;
  is_correct: boolean;
  position: number;
}

export interface Response {
  id: string;
  interaction_id: string;
  participant_id: string;
  option_id: string | null;
  text_value: string | null;
  rating_value: number | null;
  submitted_at: string;
}

export interface QAQuestion {
  id: string;
  interaction_id: string;
  participant_id: string;
  question_text: string;
  is_pinned: boolean;
  is_hidden: boolean;
  ai_answer: string | null;
  created_at: string;
  // Joined fields
  upvote_count?: number;
  participant?: Participant;
  has_upvoted?: boolean;
}

export interface QAUpvote {
  id: string;
  question_id: string;
  participant_id: string;
}

// ── API request/response types ──

export interface CreateEventRequest {
  event_name: string;
  event_code: string;
  allow_anonymous?: boolean;
  show_results?: ShowResults;
}

export interface CreateInteractionRequest {
  event_id: string;
  type: InteractionType;
  title: string;
  config?: InteractionConfig;
  options?: { option_text: string; is_correct?: boolean }[];
}

export interface SubmitResponseRequest {
  interaction_id: string;
  participant_id: string;
  option_id?: string;
  text_value?: string;
  rating_value?: number;
}

export interface SubmitQuestionRequest {
  interaction_id: string;
  participant_id: string;
  question_text: string;
}

export interface JoinEventRequest {
  event_code: string;
  display_name?: string;
}

// ── Aggregated result types ──

export interface PollResult {
  option_id: string;
  option_text: string;
  option_letter: string;
  count: number;
  percentage: number;
}

export interface QuizLeaderboardEntry {
  participant_id: string;
  display_name: string;
  score: number;
  total: number;
  time_seconds: number;
}
