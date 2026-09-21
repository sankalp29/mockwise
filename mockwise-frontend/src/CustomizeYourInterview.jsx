import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Row, Col, Button, Card } from 'react-bootstrap';
import { pickSystemDesignQuestions } from './system-design/systemDesignQuestions';
import './styles/CustomizeYourInterview.css';

/** Path segment under /practice/:interviewType */
export const PRACTICE_TYPES = {
  coding: 'coding',
  systemDesign: 'system-design',
};

const INTERVIEW_TYPES = [
  { id: PRACTICE_TYPES.coding, label: 'Coding' },
  { id: PRACTICE_TYPES.systemDesign, label: 'System Design', badge: 'Free' },
  { id: 'behavioral', label: 'Behavioral', badge: 'Soon', disabled: true },
];

const ACTIVE_PRACTICE_TYPES = new Set([
  PRACTICE_TYPES.coding,
  PRACTICE_TYPES.systemDesign,
]);

const options = {
  difficulty: ['Easy', 'Medium', 'Hard'],
  questions: ['1 Question', '2 Questions', '3 Questions'],
  time: ['30 Minutes', '45 Minutes', '60 Minutes'],
};

function normalizePracticeType(param) {
  return ACTIVE_PRACTICE_TYPES.has(param) ? param : null;
}

const SelectionGroup = ({ label, options: groupOptions, selected, onSelect }) => {
  return (
    <Row className="align-items-center mb-4">
      {/* Label Column */}
      <Col xs={12} md={3}>
        <h5 className="mb-0">{label}</h5>
      </Col>

      {/* Options Column */}
      <Col xs={12} md={9}>
        <Row className="g-3">
          {groupOptions.map((opt) => (
            <Col key={opt} xs={12} md={4}>
              <Button
                variant={selected === opt ? 'success' : 'light'}
                className="w-100 fw-semibold py-3"
                onClick={() => onSelect(opt)}
              >
                {opt}
              </Button>
            </Col>
          ))}
        </Row>
      </Col>
    </Row>
  );
};

function CustomizeYourInterview() {
  const { interviewType: typeParam } = useParams();
  const pathType = normalizePracticeType(typeParam);
  const navigate = useNavigate();

  // Local state for instant selection; URL path is source of truth for deep-links.
  const [interviewType, setInterviewType] = useState(
    () => pathType || PRACTICE_TYPES.coding
  );
  const isSystemDesign = interviewType === PRACTICE_TYPES.systemDesign;

  const [difficulty, setDifficulty] = useState('Medium');
  const [questions, setQuestions] = useState('2 Questions');
  const [time, setTime] = useState('45 Minutes');
  const [startError, setStartError] = useState('');

  // Sync when Header / in-app links change /practice/coding|system-design
  useEffect(() => {
    if (pathType) setInterviewType(pathType);
  }, [pathType]);

  // Unknown type segment → canonical coding path
  if (!pathType) {
    return <Navigate to={`/practice/${PRACTICE_TYPES.coding}`} replace />;
  }

  const handleInterviewTypeChange = (typeId) => {
    if (typeId === interviewType || !ACTIVE_PRACTICE_TYPES.has(typeId)) return;
    // Update UI immediately — path update follows for a consistent URL format
    setInterviewType(typeId);
    setStartError('');
    navigate(`/practice/${typeId}`, { replace: true });
  };

  const handleStartInterview = () => {
    const numQuestions = parseInt(questions, 10) || 1;
    const timeMinutes = parseInt(time, 10) || 45;
    setStartError('');

    if (isSystemDesign) {
      const assigned = pickSystemDesignQuestions(difficulty, numQuestions);
      if (assigned.length === 0) {
        setStartError(
          `No system design questions are available for ${difficulty} yet. Try another difficulty.`
        );
        return;
      }
      try {
        sessionStorage.removeItem('sd_session_timer_v2');
      } catch {
        /* ignore */
      }
      navigate('/system-design/session', {
        state: {
          durationMinutes: timeMinutes,
          difficulty,
          questionIds: assigned.map((q) => q.id),
          startedAt: Date.now(),
          freeAccess: true,
        },
      });
      return;
    }

    const startToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    navigate('/interview/start', {
      state: { difficulty, numQuestions, timeMinutes, startToken },
    });
  };

  return (
    <>
      <div className="text-center mt-6 mb-4">
        <h1 className="fw-bold mb-4" style={{ fontSize: '4rem' }}>
          Customize Your Interview
        </h1>
        <h5>Make your selections below and start your session immediately.</h5>
      </div>

      <div
        className="cyi-type-bar"
        role="tablist"
        aria-label="Interview type"
      >
        {INTERVIEW_TYPES.map((type) => {
          const selected = interviewType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={type.disabled}
              className={`cyi-type-bar-item${selected ? ' is-selected' : ''}${
                type.disabled ? ' is-disabled' : ''
              }`}
              onClick={() => handleInterviewTypeChange(type.id)}
            >
              <span>{type.label}</span>
              {type.badge ? (
                <span className="cyi-type-bar-badge">{type.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="d-flex justify-content-center align-items-center">
        <Card
          className="bg-transparent p-4 rounded-5 text-white light"
          style={{ width: '80%' }}
        >
          <SelectionGroup
            label="Difficulty Level"
            options={options.difficulty}
            selected={difficulty}
            onSelect={(value) => {
              setDifficulty(value);
              setStartError('');
            }}
          />
          <SelectionGroup
            label="Number of Questions"
            options={options.questions}
            selected={questions}
            onSelect={setQuestions}
          />
          <SelectionGroup
            label="Interview Time"
            options={options.time}
            selected={time}
            onSelect={setTime}
          />

          <div className="text-center">
            {startError ? (
              <p className="text-warning mb-2" role="alert">
                {startError}
              </p>
            ) : null}
            <Button
              variant="success"
              size="md"
              className="mt-6 mb-4 fw-bold py-3 px-5"
              onClick={handleStartInterview}
            >
              Start Interview
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

export default CustomizeYourInterview;
