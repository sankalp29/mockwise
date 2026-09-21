import { useContext, useEffect, useState } from "react";
import { Button, Container, Col } from "react-bootstrap";
import { Link } from 'react-router-dom';
import { SupabaseAuthContext } from "../SupabaseAuthContext";
import axios from "axios";
import { buildApiUrl, API_ENDPOINTS } from "../utils/api";
import { logger } from "../utils/logger";
import "../styles/Home.css";

function HomeUpperBody() {
  const { user, getAccessToken } = useContext(SupabaseAuthContext);
  const userLoggedIn = !!user;
  const [ongoingInterview, setOngoingInterview] = useState(null);

  useEffect(() => {
    if (userLoggedIn) {
      checkForOngoingInterview();
    }
  }, [userLoggedIn]);

  const checkForOngoingInterview = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await axios.get(buildApiUrl(API_ENDPOINTS.INTERVIEW_ONGOING), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.hasOngoingInterview) {
        setOngoingInterview(response.data);
      } else {
        setOngoingInterview(null);
      }
    } catch (error) {
      logger.error('Error checking for ongoing interview:', error);
      setOngoingInterview(null);
    }
  };

  const handleStartClick = (e) => {
    if (!userLoggedIn) {
      e.preventDefault();
      // Ensure the app redirects to practice after successful login
      sessionStorage.setItem('returnTo', '/practice/coding');
      // Trigger login modal (same as before)
      window.dispatchEvent(new Event('open-login-modal'));
    }
  };

  const handleResumeClick = (_e) => {
    if (ongoingInterview) {
      // Navigate to the ongoing interview
      window.location.href = `/interview/session/${ongoingInterview.interviewId}`;
    }
  };

  
  return (
    <Container fluid className="d-flex align-items-center justify-content-center text-white" style={{ minHeight: "30vh", paddingTop: "20vh"}}>
        <Col className="text-center px-4">
            <h1 className="display-5 fw-bold" style={{fontSize : "4rem"}}>
              Master your next interview with 
              <br />
              <div className="mockwise-gradient mockwise-pulse">MockWise</div>
            </h1>
            <h5 className="mt-3 mb-5"
            style={{
                overflow: "visible",
                textOverflow: "unset",
            }}
            >
              Solving a problem is step one. <span className="mockwise-gradient"> Mockwise </span>helps you understand how well you solved it, what you left out, and how to reach the best approach.
            </h5>

            {userLoggedIn && ongoingInterview ? (
              <div className="d-flex flex-column align-items-center gap-3">
                <div className="d-flex align-items-center gap-3">
                  <Button 
                    onClick={handleResumeClick} 
                    variant="success" 
                    size="lg" 
                    className="fw-bold rounded-pill" 
                    type="button" 
                    style={{ fontSize: "1.5rem", padding: "1rem 2rem" }}
                  >
                    Resume ongoing interview
                  </Button>
                </div>
              </div>
            ) : (
              <Button as={Link} to="/practice/coding" onClick={handleStartClick} variant="success" size="lg" className="fw-bold rounded-pill mb-6" type="button" style={{ fontSize: "1.5rem", padding: "1rem 2rem" }}>
                Start a Mock Interview
              </Button>
            )}
        </Col>
    </Container>
  );
}

export default HomeUpperBody;