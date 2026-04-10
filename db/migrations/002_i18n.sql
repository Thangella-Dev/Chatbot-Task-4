create table if not exists knowledge_i18n (
  id bigserial primary key,
  question_norm text not null,
  language_code text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (question_norm, language_code),
  constraint fk_knowledge_i18n_question_norm foreign key (question_norm) references knowledge(question_norm) on delete cascade
);

