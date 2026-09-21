import { Container, Row, Col } from 'react-bootstrap';

function AboutUsSection() {
  return (
    <Container id="about-us" className="py-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <h1 className="fw-bold mb-4 text-center" style={{ color: 'white' }}>about_us = &#123; &quot;differentiator&quot;: &quot;..&quot;, &quot;vision&quot;: &quot;..&quot; &#125;</h1>

          <p className="lead mb-4" style={{ color: 'white', textAlign: 'left' }}>
            <span className="mockwise-gradient">Mockwise</span> is a real interview simulator built for coding interviews. It’s where preparation meets pressure, combining curated questions, strict time limits, and structured feedback to recreate the intensity of an actual interview room.
          </p>

          <p className="lead mb-4" style={{ color: 'white', textAlign: 'left' }}>
            We’re kicking things off with coding interviews. You choose how many questions you want, set the difficulty, and decide the time frame. Once the timer starts, it’s game on — just like the real thing. Unlike practice platforms where you can run and re-run your code endlessly, on Mockwise you dry-run your solution and submit with confidence.
          </p>

          <p className="lead mb-4" style={{ color: 'white', textAlign: 'left' }}>
            When you submit, we go beyond pass/fail. Your solution is broken down with detailed feedback on:
            <ul>
              <li style={{ color: 'white', textAlign: 'left' }}>Overall problem-solving approach</li>
              <li style={{ color: 'white', textAlign: 'left' }}>Optimality</li>
              <li style={{ color: 'white', textAlign: 'left' }}>Time and space complexity</li>
              <li style={{ color: 'white', textAlign: 'left' }}>Code clarity & readability</li>
            </ul>
          </p>

          <p className="lead mb-4" style={{ color: 'white', textAlign: 'left' }}>
            What makes Mockwise unique is the depth of feedback. Passing test cases isn’t enough — your code might work, but is it the best way to solve the problem? On Mockwise, you’ll know. If you solved it in three passes when a two-pass solution was possible, we’ll point it out. If your complexity is fine but your approach leaves room for improvement, you’ll hear about it. That level of insight is what sets Mockwise apart — helping you close the gap between solving problems and solving them like a top-tier engineer.
          </p>

          <p className="lead mb-4" style={{ color: 'white', textAlign: 'left' }}>
            This is only phase one. Next, we’re bringing the same realism and depth of feedback to behavioral interviews — so you can prepare for more of the technical interview process in one place.
          </p>
        </Col>
      </Row>
    </Container>
  );
}

export default AboutUsSection;
