import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, ProgressBar, Alert, Button } from 'react-bootstrap';

function DemoFeedback() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { submissions = [], questions = [], fallbackMode = false, error = null } = location.state || {};

  const getScoreColor = (score) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    if (score >= 4) return 'info';
    return 'danger';
  };

  // Generate demo feedback for each submission
  const generateDemoFeedback = (question, code, _index) => {
    // Simple scoring based on code length and presence of certain keywords
    const codeLength = code ? code.length : 0;
    const hasLoops = /for|while/.test(code || '');
    const hasValidReturn = /return/.test(code || '');
    const hasComments = /\/\//.test(code || '');
    
    const correctnessScore = hasValidReturn ? (codeLength > 50 ? 8 : 6) : 3;
    const clarityScore = hasComments ? 9 : (codeLength > 100 ? 6 : 7);
    const timeComplexityScore = hasLoops ? 7 : 5;
    const spaceComplexityScore = 6;
    const modularityScore = codeLength > 200 ? 5 : 7;
    
    const overallRating = Math.round((correctnessScore + clarityScore + timeComplexityScore + spaceComplexityScore + modularityScore) / 5);

    return {
      correctness: {
        score: correctnessScore,
        feedback: hasValidReturn ? "Good! Your solution returns a value." : "Consider adding a return statement."
      },
      timeComplexity: {
        score: timeComplexityScore,
        feedback: hasLoops ? "Good use of iteration for efficiency." : "Consider the time complexity of your approach.",
        bigO: hasLoops ? "O(n)" : "O(1)"
      },
      spaceComplexity: {
        score: spaceComplexityScore,
        feedback: "Space usage looks reasonable for this problem.",
        bigO: "O(1)"
      },
      clarity: {
        score: clarityScore,
        feedback: hasComments ? "Excellent use of comments!" : "Consider adding comments to explain your logic."
      },
      modularity: {
        score: modularityScore,
        feedback: codeLength > 200 ? "Consider breaking this into smaller functions." : "Good function structure."
      },
      overallRating,
      overallFeedback: `This is a demo feedback for your solution. Your code shows ${codeLength > 100 ? 'good detail' : 'concise thinking'}. ${hasValidReturn ? 'Great job on returning a result!' : 'Remember to return your answer.'}`,
      strengths: [
        ...(hasValidReturn ? ["Returns a value"] : []),
        ...(hasComments ? ["Well-commented code"] : []),
        ...(codeLength > 50 ? ["Detailed implementation"] : ["Concise approach"])
      ],
      improvements: [
        ...(!hasValidReturn ? ["Add return statement"] : []),
        ...(!hasComments ? ["Add explanatory comments"] : []),
        ...(codeLength < 30 ? ["Consider edge cases"] : [])
      ]
    };
  };

  const renderFeedbackCard = (question, code, index) => {
    const feedback = generateDemoFeedback(question, code, index);
    
    return (
      <Card className="mb-4" key={index}>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Question {index + 1}: {question.title}</h5>
            <Badge bg={getScoreColor(feedback.overallRating)} className="fs-6">
              {feedback.overallRating}/10 (Demo)
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Performance Metrics (Demo)</h6>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Correctness</span>
                  <span>{feedback.correctness.score}/10</span>
                </div>
                <ProgressBar 
                  now={(feedback.correctness.score / 10) * 100} 
                  variant={getScoreColor(feedback.correctness.score)}
                  className="mb-2"
                />
                <small className="text-muted">{feedback.correctness.feedback}</small>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Time Complexity</span>
                  <span>{feedback.timeComplexity.score}/10</span>
                </div>
                <ProgressBar 
                  now={(feedback.timeComplexity.score / 10) * 100} 
                  variant={getScoreColor(feedback.timeComplexity.score)}
                  className="mb-2"
                />
                <small className="text-muted">
                  Big O: {feedback.timeComplexity.bigO} - {feedback.timeComplexity.feedback}
                </small>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Space Complexity</span>
                  <span>{feedback.spaceComplexity.score}/10</span>
                </div>
                <ProgressBar 
                  now={(feedback.spaceComplexity.score / 10) * 100} 
                  variant={getScoreColor(feedback.spaceComplexity.score)}
                  className="mb-2"
                />
                <small className="text-muted">
                  Big O: {feedback.spaceComplexity.bigO} - {feedback.spaceComplexity.feedback}
                </small>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Code Clarity</span>
                  <span>{feedback.clarity.score}/10</span>
                </div>
                <ProgressBar 
                  now={(feedback.clarity.score / 10) * 100} 
                  variant={getScoreColor(feedback.clarity.score)}
                  className="mb-2"
                />
                <small className="text-muted">{feedback.clarity.feedback}</small>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Modularity</span>
                  <span>{feedback.modularity.score}/10</span>
                </div>
                <ProgressBar 
                  now={(feedback.modularity.score / 10) * 100} 
                  variant={getScoreColor(feedback.modularity.score)}
                  className="mb-2"
                />
                <small className="text-muted">{feedback.modularity.feedback}</small>
              </div>
            </Col>
            
            <Col md={6}>
              <h6>Overall Feedback (Demo)</h6>
              <p className="mb-3">{feedback.overallFeedback}</p>

              {feedback.strengths && feedback.strengths.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-success">Strengths</h6>
                  <ul className="list-unstyled">
                    {feedback.strengths.map((strength, idx) => (
                      <li key={idx} className="mb-1">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.improvements && feedback.improvements.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-danger">Areas for Improvement</h6>
                  <ul className="list-unstyled">
                    {feedback.improvements.map((improvement, idx) => (
                      <li key={idx} className="mb-1">
                        <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3">
                <h6>Your Code</h6>
                <pre className="bg-light p-3 rounded" style={{ maxHeight: '200px', overflow: 'auto' }}>
                  <code>{code || '// No code submitted'}</code>
                </pre>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const overallAverage = submissions.length > 0 
    ? submissions.reduce((sum, code, index) => {
        const feedback = generateDemoFeedback(questions[index], code, index);
        return sum + feedback.overallRating;
      }, 0) / submissions.length 
    : 0;

  return (
    <Container className="py-4">
      {error && (
        <Alert variant="warning" className="mb-4">
          <Alert.Heading>Demo Mode</Alert.Heading>
          <p>There was an issue with the backend: {error}</p>
          <p>This is a demo feedback page showing how the Claude AI feedback would look.</p>
        </Alert>
      )}

      {fallbackMode && !error && (
        <Alert variant="info" className="mb-4">
          <Alert.Heading>Demo Mode</Alert.Heading>
          <p>This is a demonstration of the AI feedback system. In production, this would be powered by Claude Sonnet 4.</p>
        </Alert>
      )}

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="fw-bold" style={{ fontSize: '4rem' }}>Interview Feedback {fallbackMode || error ? '(Demo)' : ''}</h1>
            <p className="text-muted mb-0">
              {questions.length} questions completed
            </p>
          </div>
          <div className="text-end">
            <Badge bg={getScoreColor(overallAverage)} className="fs-5 px-3 py-2">
              Overall: {overallAverage.toFixed(1)}/10 {fallbackMode || error ? '(Demo)' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {questions.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading>No questions found</Alert.Heading>
          <p>It looks like there were no questions in this interview.</p>
        </Alert>
      ) : (
        questions.map((question, index) => renderFeedbackCard(question, submissions[index], index))
      )}

      <div className="text-center mt-4">
        <Button variant="primary" onClick={() => navigate('/dashboard')} className="me-3">
          View Dashboard
        </Button>
        <Button variant="secondary" onClick={() => navigate('/practice/coding')}>
          Start New Interview
        </Button>
      </div>
    </Container>
  );
}

export default DemoFeedback;
