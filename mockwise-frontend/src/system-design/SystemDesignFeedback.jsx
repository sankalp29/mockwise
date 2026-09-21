import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  ProgressBar,
  Button,
  Accordion,
  Alert,
} from 'react-bootstrap';
import {
  getDefaultSystemDesignQuestion,
  getSystemDesignQuestion,
} from './systemDesignQuestions';
import '../styles/InterviewFeedback.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

/**
 * HLD rubrics — intentionally different from DSA (correctness, Big-O, code clarity).
 * Mock scores only; no backend evaluation yet.
 */
const SD_METRICS = [
  {
    key: 'requirements',
    label: 'Requirements & scope',
    icon: 'bi-list-check',
  },
  {
    key: 'highLevelDesign',
    label: 'High-level architecture',
    icon: 'bi-diagram-3',
  },
  {
    key: 'dataAndApis',
    label: 'Data model & APIs',
    icon: 'bi-database',
  },
  {
    key: 'scalability',
    label: 'Scalability & bottlenecks',
    icon: 'bi-graph-up-arrow',
  },
  {
    key: 'reliability',
    label: 'Reliability & failure modes',
    icon: 'bi-shield-check',
  },
  {
    key: 'tradeoffs',
    label: 'Trade-offs & communication',
    icon: 'bi-chat-dots',
  },
];

function getScoreColor(score) {
  if (score === -1) return 'secondary';
  if (score >= 8) return 'success';
  if (score >= 6) return 'warning';
  return 'danger';
}

/** Deterministic mock scores so the same question looks stable across reloads. */
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function scoreFromSeed(seed, salt, min = 5, max = 9) {
  const n = (seed + salt * 17) % (max - min + 1);
  return min + n;
}

function buildMockFeedback(question, index) {
  const seed = hashSeed(`${question?.id || 'default'}-${index}`);
  const scores = {
    requirements: scoreFromSeed(seed, 1),
    highLevelDesign: scoreFromSeed(seed, 2),
    dataAndApis: scoreFromSeed(seed, 3),
    scalability: scoreFromSeed(seed, 4),
    reliability: scoreFromSeed(seed, 5),
    tradeoffs: scoreFromSeed(seed, 6),
  };

  const overallRating = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
  );

  const title = question?.title || 'this design problem';

  return {
    scores,
    details: {
      requirements: {
        score: scores.requirements,
        feedback: `You framed functional and non-functional needs for ${title}. Call out explicit assumptions (scale, latency, consistency) earlier so the rest of the design stays grounded.`,
      },
      highLevelDesign: {
        score: scores.highLevelDesign,
        feedback:
          'Core services and request paths are visible. Strengthen the diagram with clear boundaries (client → edge → app → data) and label protocols on critical edges.',
      },
      dataAndApis: {
        score: scores.dataAndApis,
        feedback:
          'Entities and primary keys are mostly clear. Tighten API shapes (request/response) and call out indexes or access patterns that drive the storage choice.',
      },
      scalability: {
        score: scores.scalability,
        feedback:
          'You identified at least one hot path. Go deeper on partitioning, caching layers, and what fails first under 10× load — and how you would mitigate it.',
      },
      reliability: {
        score: scores.reliability,
        feedback:
          'Basic redundancy is implied. Spell out failure modes (node loss, cache stampede, queue backlog) and whether you fail open or closed for each critical path.',
      },
      tradeoffs: {
        score: scores.tradeoffs,
        feedback:
          'Some trade-offs are stated. Make consistency vs availability and cost vs latency choices explicit, and say what you would deprioritize under time pressure.',
      },
    },
    overallRating,
    overallFeedback: `Mock system design review for “${title}”. Unlike coding rounds, this feedback focuses on architecture, data, scale, and reliability — not code correctness or Big-O of an algorithm. Use it to practice how interviewers score HLD diagrams and explanations.`,
    strengths: [
      'Stated the problem in product terms before diving into boxes',
      'Drew a multi-tier architecture instead of a single service',
      'Mentioned at least one scaling concern (read/write path or fan-out)',
    ],
    improvements: [
      'Quantify capacity (QPS, storage growth) before choosing stores',
      'Show the happy path and one failure path on the whiteboard',
      'Close with a short recap of trade-offs and open risks',
    ],
  };
}

function resolveQuestionsFromState(state) {
  const ids = Array.isArray(state?.questionIds) ? state.questionIds : null;
  if (ids?.length) {
    return ids.map((id) => getSystemDesignQuestion(id)).filter(Boolean);
  }
  if (state?.questionId) {
    return [getSystemDesignQuestion(state.questionId)];
  }
  if (state?.questions?.length) {
    return state.questions;
  }
  return [getDefaultSystemDesignQuestion()];
}

function SystemDesignFeedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const meta = useMemo(
    () => ({
      difficulty: location.state?.difficulty || 'Medium',
      durationMinutes: location.state?.durationMinutes || 45,
      freeAccess: location.state?.freeAccess !== false,
    }),
    [location.state]
  );

  const questions = useMemo(
    () => resolveQuestionsFromState(location.state),
    [location.state]
  );

  const feedbackItems = useMemo(
    () => questions.map((q, i) => ({ question: q, feedback: buildMockFeedback(q, i) })),
    [questions]
  );

  const safeIndex = Math.min(currentIndex, Math.max(0, feedbackItems.length - 1));
  const current = feedbackItems[safeIndex];

  const overallAverage = useMemo(() => {
    if (!feedbackItems.length) return 0;
    const sum = feedbackItems.reduce((s, item) => s + item.feedback.overallRating, 0);
    return sum / feedbackItems.length;
  }, [feedbackItems]);

  if (!current) {
    return (
      <Container className="py-5">
        <Alert variant="info">
          <Alert.Heading>No system design session found</Alert.Heading>
          <p>Start a system design interview to see mocked architecture feedback.</p>
          <Button
            variant="success"
            className="fw-bold"
            onClick={() => navigate('/practice/system-design')}
          >
            Start system design
          </Button>
        </Alert>
      </Container>
    );
  }

  const { question, feedback } = current;

  return (
    <Container className="py-4">
      <div className="mb-4">
        <div className="position-relative">
          <h1 className="text-center m-0 fw-bold" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            System Design Feedback
          </h1>
          <div className="position-absolute mt-2 top-0 end-0 d-none d-md-block">
            <Badge bg={getScoreColor(overallAverage)} className="fs-5 px-3 py-2">
              Overall: {overallAverage.toFixed(1)}/10
            </Badge>
          </div>
          <p className="text-center text-white mb-1 mt-2">
            {meta.difficulty} · {questions.length} prompt
            {questions.length === 1 ? '' : 's'} · {meta.durationMinutes} minutes
            {meta.freeAccess ? ' · Free mock' : ''}
          </p>
          <p className="text-center text-white-50 small mb-0">
            Judged on architecture rubrics — not DSA correctness, Big-O, or code clarity.
          </p>
          <div className="text-center mt-2 d-md-none">
            <Badge bg={getScoreColor(overallAverage)} className="fs-6 px-3 py-2">
              Overall: {overallAverage.toFixed(1)}/10
            </Badge>
          </div>
        </div>
      </div>

      <Alert variant="success" className="border-0" style={{ background: 'rgba(25, 135, 84, 0.18)' }}>
        <strong>Mock feedback</strong> — scores are illustrative for UI preview. Live AI review of
        whiteboard diagrams is not connected yet.
      </Alert>

      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0">
              Prompt {safeIndex + 1}: {question.title}
            </h5>
            <Badge bg={getScoreColor(feedback.overallRating)} className="fs-6">
              {feedback.overallRating}/10 (Mock)
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h5 className="fw-bold d-flex align-items-center">
                <i className="bi bi-buildings text-primary me-2 align-middle" />
                Architecture metrics
              </h5>

              {SD_METRICS.map((metric) => {
                const detail = feedback.details[metric.key];
                return (
                  <div className="mb-3 feedback-card" key={metric.key}>
                    <Accordion>
                      <Accordion.Item eventKey={`${metric.key}-${safeIndex}`}>
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100">
                            <span>
                              <i className={`bi ${metric.icon} me-2`} />
                              {metric.label}
                            </span>
                            <span className="feedback-link text-muted">View detailed feedback</span>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <p className="text-black mb-0">{detail.feedback}</p>
                        </Accordion.Body>
                      </Accordion.Item>
                    </Accordion>
                    <div className="d-flex align-items-center justify-content-between mt-3">
                      <ProgressBar
                        now={(detail.score / 10) * 100}
                        variant={getScoreColor(detail.score)}
                        className="flex-grow-1 me-3 progress-bar"
                      />
                      <span className="fw-bold text-black flex-shrink-0 score-box">
                        {detail.score}/10
                      </span>
                    </div>
                  </div>
                );
              })}
            </Col>

            <Col md={6}>
              <div className="mb-3 ms-md-3 me-md-3 p-3 rounded shadow-sm strengths-box">
                <h5 className="fw-bold text-success">
                  <i className="bi bi-check-square-fill me-2 text-success" />
                  Strengths
                </h5>
                <ul className="mb-0">
                  {feedback.strengths.map((s) => (
                    <li key={s} className="mb-1 text-black">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-3 ms-md-3 me-md-3 p-3 rounded shadow-sm weaknesses-box">
                <h5 className="fw-bold text-danger">
                  <i className="bi bi-x-square-fill me-2 text-danger" />
                  Areas for improvement
                </h5>
                <ul className="mb-0">
                  {feedback.improvements.map((s) => (
                    <li key={s} className="mb-1">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 mb-3 ms-md-3 me-md-3 p-3 rounded shadow-sm score-box">
                <h5 className="fw-bold d-flex align-items-center mb-2 text-black">
                  <i className="bi bi-chat-square-text text-warning me-2 align-middle" />
                  Overall feedback
                </h5>
                <p className="mb-2 fw-normal text-black">{feedback.overallFeedback}</p>
                <span className="me-2 fw-bold text-black">Score for this prompt:</span>
                <span className="fw-bold text-black score-box">
                  {feedback.overallRating}/10
                </span>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {feedbackItems.length > 1 ? (
        <div className="d-flex justify-content-center align-items-center flex-wrap gap-2 mt-2">
          {feedbackItems.map((item, idx) => (
            <Button
              key={item.question.id || idx}
              variant={idx === safeIndex ? 'success' : 'outline-success'}
              className="fw-bold rounded-circle"
              style={{
                width: '40px',
                height: '40px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => setCurrentIndex(idx)}
              title={item.question.title}
            >
              {idx + 1}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="text-center mt-5">
        <Button
          variant="primary"
          className="me-3 fw-bold"
          onClick={() => navigate('/home')}
        >
          Back to home
        </Button>
        <Button
          variant="success"
          className="fw-bold"
          onClick={() => navigate('/practice/system-design')}
        >
          Start new system design
        </Button>
      </div>
    </Container>
  );
}

export default SystemDesignFeedback;
