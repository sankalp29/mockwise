import { Container, Accordion } from 'react-bootstrap';
import { Row, Col } from 'react-bootstrap';
import '../styles/FAQ.css';

function FAQSection() {
  return (
    <Container id="faqs" className="my-5 py-5">
      <Row className="justify-content-center">
        <Col md={5} className="text-start mt-5">
          <h1 className="fw-bold mb-2 text-white">frequentlyAskedQuestions &#123;</h1>
          <p className="" style={{color: "white", fontSize: "1.1rem"}}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;question 1&quot;: &quot;answer 1&quot;,<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;question 2&quot;: &quot;answer 2&quot;,<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&quot;question 3&quot;: &quot;answer 3&quot;,<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.<br /><h1>&#125;</h1></p>
        </Col>
        <Col md={7}>
          <Accordion>
            <Accordion.Item eventKey="0">
              <Accordion.Header>How is MockWise different from platforms like LeetCode or HackerRank?</Accordion.Header>
              <Accordion.Body>
                LeetCode and HackerRank are for practice. MockWise is for the real thing.
                Those platforms help you learn and drill problems — but when it’s time to test if you’re truly interview-ready, you need MockWise. 
                Here, there’s no “Run Code” safety net. Just you, the timer, and the intensity of a real interview. 
                You’ll dry run, debug, and think under pressure.
                With a syntax checker for small slips and feedback that goes far beyond pass/fail — overall problem-solving, time and space complexity, and code clarity — MockWise mirrors the real interview room like nothing else.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1">
              <Accordion.Header className='fw-light'>Is MockWise suitable for beginners, or only for experienced developers?</Accordion.Header>
              <Accordion.Body>
                MockWise is best suited for developers who already know the basics and have practiced on platforms like LeetCode. It’s designed to test readiness under real interview pressure, not to teach fundamentals.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="2">
              <Accordion.Header>What interview types does MockWise currently support?</Accordion.Header>
              <Accordion.Body>
                Right now, MockWise supports coding interview simulations. Behavioral rounds will be added in upcoming phases.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="3">
              <Accordion.Header>⁠How does the timer work, and can I pause it?</Accordion.Header>
              <Accordion.Body>
                The timer starts as soon as your interview begins and runs continuously — it cannot be paused, to keep the experience authentic.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="4">
              <Accordion.Header>Can I run my code during the interview simulation?</Accordion.Header>
              <Accordion.Body>
                No — you cannot run your code during the simulation. To keep the experience authentic, you’re expected to dry-run your solution and catch mistakes on your own, just as you would in a real interview. We only provide you with a syntax checker only to avoid small slip-ups blocking your flow.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="5">
              <Accordion.Header>What kind of feedback will I receive after a mock interview?</Accordion.Header>
              <Accordion.Body>
                After each mock interview, you get detailed, structured feedback that analyzes your performance across key areas interviewers focus on:
                <br />
                <br />
                <ul>
                  <li><strong>Overall problem-solving approach</strong> – how well did you structure your solution?</li>
                  <li><strong>Optimality</strong> – how efficient and well-optimized is your solution compared to the best possible approach?</li>
                  <li><strong>Time and space complexity</strong> – how efficient and scalable is your approach?</li>
                  <li><strong>Code clarity and readability</strong> – is your code clean, maintainable, and easy to follow?</li>
                </ul>
                This way, you don’t just see if your code worked — you understand how it would be judged in a real interview.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="6">
              <Accordion.Header>How are the solutions evaluated?</Accordion.Header>
              <Accordion.Body>
                Every solution you submit is evaluated just like in a real technical interview — not only based on whether it runs, but on how well it’s designed, how efficient it is, and how clearly it’s written.
                <br />
                <br />
                Here’s how the evaluation breaks down by importance:
                <ul>
                  <li>
                  <strong>Correctness is the most critical factor.</strong> If your code doesn’t produce the right results — especially for edge cases — then all other aspects like optimality, clarity, and complexity become irrelevant and have no impact on your evaluation. Correctness determines whether your solution proceeds to the weighted scoring process.
                  </li>
                  <li>
                  <strong>Optimality (75% weight) is key once your code works.</strong> If your solution is correct, the next question is: how well does it scale? A brute-force approach might work, but it won't score well. The better your algorithm, the stronger your feedback will be.
                  </li>
                  <li>
                    <strong>Time & Space Complexity (10% weight each):</strong> You’ll self-assess these, and we’ll compare your expectations to your code’s actual complexity. If your self-assessment doesn’t align with the actual code, this area will reflect that.
                  </li>
                  <li>
                    <strong>Code Clarity (5% weight):</strong> Clean, readable, and well-structured code matters. Even the best algorithms need to be easy to follow—this shows professionalism and good coding habits.
                  </li>
                </ul>

                Along with scores, you get detailed feedback on your strengths and clear suggestions for improvement—giving you actionable insights on how to grow.

                <br />
                <br />
                <strong>In short:</strong> it’s not just about passing — it’s about understanding how real interviewers evaluate your work and learning how to improve with each submission. Dive in and see how you can level up your coding skills!
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="7">
              <Accordion.Header>Do I get access to my past attempts and results?</Accordion.Header>
              <Accordion.Body>
                Yes — all your past mocks are saved. You can revisit every attempt, review detailed feedback, and track your progress over time.
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Col>
      </Row>
      <div className="mt-5 text-center">
        <p style={{color: "white", fontSize: "1.2rem"}}>Have more questions? Email us at <a href="mailto:mockwisehelp@gmail.com" style={{color: "#87ceeb", textDecoration: "none", fontWeight: "bold"}}>mockwisehelp@gmail.com</a></p>
      </div>
    </Container>
  );
}

export default FAQSection;
