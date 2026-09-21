import ReactMarkdown from 'react-markdown';

/**
 * Left-rail question panel — mirrors coding InterviewSession problem pane:
 * white card, scrollable markdown-style content.
 */
function SystemDesignQuestionPanel({ question }) {
  if (!question) {
    return (
      <div className="sd-question-card">
        <p className="text-muted mb-0">No question loaded.</p>
      </div>
    );
  }

  return (
    <div className="sd-question-card">
      <div className="sd-question-scroll markdown-content text-black">
        <div className="sd-question-meta">
          <span className="sd-question-difficulty">{question.difficulty}</span>
          <span className="sd-question-mode">High-level design</span>
        </div>
        <h1 className="sd-question-title">{question.title}</h1>
        {question.summary ? (
          <p className="sd-question-summary">{question.summary}</p>
        ) : null}

        <ReactMarkdown>{question.description || ''}</ReactMarkdown>
        <ReactMarkdown>{question.constraints || ''}</ReactMarkdown>
        <ReactMarkdown>{question.notes || ''}</ReactMarkdown>

        <div className="sd-question-note alert alert-warning mt-4 mb-0">
          <strong>Note: </strong>
          This free system design session is not graded by the server. Use the whiteboard
          to structure your design under time pressure, just like a real HLD interview.
        </div>
      </div>
    </div>
  );
}

export default SystemDesignQuestionPanel;
