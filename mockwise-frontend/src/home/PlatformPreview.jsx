import { Container } from 'react-bootstrap'

function PlatformPreview() {
  return (
    <Container fluid className="mb-5 py-5 px-3">
      <div
        className="d-flex justify-content-center align-items-center position-relative"
        style={{ minHeight: '400px' }}
      >
        <div className="position-relative">
          <img
            src="/IDE.png"
            alt="MockWise IDE Interface"
            className="img-fluid shadow-lg rounded"
            style={{ maxWidth: '1200px', zIndex: 1 }}
            width={1200}
            height={832}
            decoding="async"
            loading="lazy"
          />

          <img
            src="/Feedback.png"
            alt="MockWise Feedback Interface"
            className="position-absolute img-fluid shadow-lg rounded"
            style={{
              top: '52%',
              left: '70%',
              transform: 'translate(-50%, -50%)',
              height: '75%',
              width: 'auto',
              minWidth: '550px',
              zIndex: 2,
            }}
            width={550}
            height={610}
            decoding="async"
            loading="lazy"
          />
        </div>
      </div>
    </Container>
  )
}

export default PlatformPreview
