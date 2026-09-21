import { useState } from 'react';
import { Container, Row, Col, Card, Image } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'; // Import arrow icons
import './TestimonialSection.css';

function TestimonialSection() {
  // Start index of the currently visible trio
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(null); // 'right' for next, 'left' for prev

  const testimonials = [
    {
      id: 1,
      quote: "1. MockWise crafted a learning plan for me, and I made more progress months than I did in a year flying solo. Highly recommend!",
      author: "Nipun, Senior Software Engineer at Zoomcar",
      image: "/public/coding-interview-steps-logos/pick-your-playground-colorful.png"
    },
    {
      id: 2,
      quote: "2. MockWise took my coding game to a whole new level. It's like having a tech mentor in your pocket, always there when you need it!",
      author: "- Himanshu, Senior Software Engineer at Google",
      image: "/public/coding-interview-steps-logos/code-submit-get-schooled-colorful.png"
    },
    {
      id: 3,
      quote: "3. MockWise isn't just another practice platform, it's like a coding partner that pushes you to think harder. I'm genuinely better because of it.",
      author: "- Mridul, Software Engineer 2 at Broome",
      image: "/public/coding-interview-steps-logos/level-up.png"
    },
    {
      id: 4,
      quote: "4. MockWise helped me identify my weak areas and provided targeted practice. Huge difference!",
      author: "- Jane Doe, Software Engineer at Microsoft",
      image: "/public/coding-interview-steps-logos/pick-your-playground-colorful.png"
    },
    {
      id: 5,
      quote: "5. The feedback on time and space complexity is invaluable. It's more than just solving a problem; it's about optimizing.",
      author: "- John Smith, Senior Developer at Amazon",
      image: "/public/coding-interview-steps-logos/code-submit-get-schooled-colorful.png"
    },
    {
      id: 6,
      quote: "6. The interview simulation felt so real, it prepared me perfectly for my actual interviews. Landed my dream job!",
      author: "- Alice Johnson, Data Scientist at Google",
      image: "/public/coding-interview-steps-logos/level-up.png"
    },
    {
      id: 7,
      quote: "7. MockWise is my go-to for interview prep. The structured approach and detailed feedback are a game-changer.",
      author: "- Bob Brown, Full Stack Engineer at Netflix",
      image: "/public/coding-interview-steps-logos/pick-your-playground-colorful.png"
    },
    {
      id: 8,
      quote: "8. The structured feedback after each mock is the closest I've felt to a real coding interview debrief.",
      author: "- Carol White, Engineering Manager at Apple",
      image: "/public/coding-interview-steps-logos/code-submit-get-schooled-colorful.png"
    },
    {
      id: 9,
      quote: "9. The ability to track progress over time has been incredibly motivating. I can clearly see my improvements.",
      author: "- David Green, DevOps Engineer at Atlassian",
      image: "/public/coding-interview-steps-logos/level-up.png"
    },
    {
      id: 10,
      quote: "10. This platform is a must-have for anyone serious about acing their coding interviews. Highly recommended!",
      author: "- Eve Black, Software Engineer at Meta",
      image: "/public/coding-interview-steps-logos/pick-your-playground-colorful.png"
    }
  ];

  const n = testimonials.length;
  const handleNext = () => {
    setDirection('right');
    setCurrentIndex((prevIndex) => (prevIndex + 3) % n);
  };

  const handlePrev = () => {
    setDirection('left');
    setCurrentIndex((prevIndex) => (prevIndex - 3 + n) % n);
  };

  // Exactly 3 visible cards based on the start index
  const visible = [0, 1, 2].map((k) => testimonials[(currentIndex + k) % n]);

  return (
    <Container id="testimonials" className="my-5 py-5 position-relative">
      <h1 className="fw-bold mb-5 text-center text-white">logger.info("What our early testers are saying");</h1>
      <Row
        key={`${currentIndex}-${direction || 'idle'}`}
        className={`justify-content-center align-items-stretch gx-4 carousel-animated ${
          direction === 'right' ? 'slide-left' : direction === 'left' ? 'slide-right' : ''
        }`}
      >
        {visible.map((testimonial) => (
          <Col
            key={testimonial.id}
            className="mb-4 d-flex justify-content-center"
            style={{ flex: '0 0 auto', width: '33.333333%' }}
          >
            <Card className="h-100 testimonial-card text-black">
              <Image src={testimonial.image} alt={`Testimonial image for ${testimonial.author}`} roundedCircle className="testimonial-image mt-3" />
              <Card.Body className="d-flex flex-column">
                <p className="mb-0 testimonial-quote">"{testimonial.quote}"</p>
                <p className="mt-auto mb-0 testimonial-author">{testimonial.author}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {n > 3 && <div className="carousel-arrow carousel-arrow-left" onClick={handlePrev}><FaChevronLeft /></div>}
      {n > 3 && <div className="carousel-arrow carousel-arrow-right" onClick={handleNext}><FaChevronRight /></div>}
    </Container>
  );
}

export default TestimonialSection;