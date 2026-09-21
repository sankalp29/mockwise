import { Container } from 'react-bootstrap'
import Toast from 'react-bootstrap/Toast'

const STEP_ICONS = [
  {
    srcWebp: '/coding-interview-steps-logos/optimized/pick-your-playground.webp',
    srcJpg: '/coding-interview-steps-logos/optimized/pick-your-playground.jpg',
    title: '1',
    heading: 'Pick your playground',
    body: 'Set the rules of the game — choose how many questions you want, the difficulty level, and the duration of your session. Once you hit start, we’ll spin up a fresh, curated mock interview designed to stretch your skills under real-world pressure.',
  },
  {
    srcWebp: '/coding-interview-steps-logos/optimized/code-submit-get-schooled.webp',
    srcJpg: '/coding-interview-steps-logos/optimized/code-submit-get-schooled.jpg',
    title: '2',
    heading: 'Code. Submit. Break it down.',
    body: 'Hop into the coding arena and work through your solution under time pressure. Once you submit, we provide an in-depth analysis of your code’s correctness, optimality, time and space complexity, and code clarity. The goal isn’t only to solve, but to sharpen how you solve.',
  },
  {
    srcWebp: '/coding-interview-steps-logos/optimized/level-up.webp',
    srcJpg: '/coding-interview-steps-logos/optimized/level-up.jpg',
    title: '3',
    heading: 'Stack your wins',
    body: 'Your journey doesn’t end when the timer does. Every mock is saved, complete with feedback and results. Revisit past attempts, track your growth over time, and spot patterns in how you solve — so you walk into the real interview sharper.',
  },
]

function HomeMiddleBody() {
  return (
    <Container id="coding-interview-flow" fluid className="mb-5 py-4 px-3 shadow-sm">
      <h1 className="text-center mb-3"> &lt; InterviewFlow /&gt;</h1>
      <div className="flow-container-v3 mb-4 d-flex justify-content-center">
        {STEP_ICONS.map((step) => (
          <Toast key={step.heading} className="flow-toast toast-styling" role="alert">
            <Toast.Header closeButton={false}>
              <div className="d-flex flex-column align-items-center w-100">
                <strong className="d-block fs-5">
                  <span className="dotted-circle-number">{step.title}</span>
                  {step.heading}
                </strong>
                <picture>
                  <source srcSet={step.srcWebp} type="image/webp" />
                  <img
                    src={step.srcJpg}
                    alt=""
                    className="toast-icon-image"
                    width={140}
                    height={140}
                    decoding="async"
                    loading="lazy"
                  />
                </picture>
              </div>
            </Toast.Header>
            <Toast.Body>{step.body}</Toast.Body>
          </Toast>
        ))}
      </div>
    </Container>
  )
}

export default HomeMiddleBody
