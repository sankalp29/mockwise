import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import Image from 'react-bootstrap/Image';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { SupabaseAuthContext } from "./SupabaseAuthContext";
import LoginModal from "./components/LoginModal";
import SignupModal from "./components/SignupModal";
import ForgotPasswordModal from "./components/ForgotPasswordModal";
import { logger } from './utils/logger';
import { AUTH_BYPASS } from './utils/authBypass';
import './styles/Header.css';
import './styles/LoginModal.css';

function Header({ showToast }) {
  const { user, signOut } = useContext(SupabaseAuthContext);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const userLoggedIn = !!user;
  const navigate = useNavigate(); // Initialize useNavigate

  const handleNavLinkClick = (e, path, sectionId) => {
    e.preventDefault();
    navigate(path);

    // Give React Router a moment to update the DOM, then force scroll
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        window.location.hash = sectionId; // Explicitly set hash
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowLoginModal(true);
    setShowSignupModal(false);
    setShowForgotPasswordModal(false);
  };

  const handleSwitchToForgotPassword = () => {
    setShowLoginModal(false);
    setShowSignupModal(false);
    setShowForgotPasswordModal(true);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      logger.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (AUTH_BYPASS) {
      return undefined;
    }
    const openLogin = () => setShowLoginModal(true);
    window.addEventListener('open-login-modal', openLogin);
    return () => {
      window.removeEventListener('open-login-modal', openLogin);
    };
  }, []);

  return (
    <>
      <Navbar expand="lg" data-bs-theme="dark">
        <Container className="text-white">
          <Navbar.Brand as={Link} to="/home" className="d-flex align-items-center me-4">
            <picture>
              <source srcSet="/mockwise-logo-128.webp" type="image/webp" />
              <Image
                src="/mockwise-logo-128.png"
                alt="Mockwise Logo"
                className="me-1"
                width={40}
                height={40}
                decoding="async"
                fetchPriority="high"
                style={{ maxHeight: '40px', width: 'auto' }}
              />
            </picture>
            <div className="mt-2 text-white mockwise-gradient">MockWise</div>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" className="navbar-toggler-white-icon"/>
          <Navbar.Collapse id="basic-navbar-nav">
            <NavDropdown
              title="Explore Interview Types"
              id="basic-nav-dropdown"
              className="mt-2 me-4 nav-hover-pill explore-interview-dropdown"
              renderMenuOnMount
              onMouseLeave={() => {
                // Clear Bootstrap focus/.show residue after pointer leaves so the
                // menu cannot stick open once CSS :hover ends.
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
              onSelect={() => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
            >
              <NavDropdown.Item onClick={(e) => handleNavLinkClick(e, "/home#coding-interview-flow", "coding-interview-flow")}>
                <div className="fw-bold">Coding</div>
              </NavDropdown.Item>
              <NavDropdown.Item className="d-flex justify-content-between align-items-center" disabled>
                <div className="fw-bold">Behavioral</div>
                <span className="badge bg-secondary ms-2">...coming soon</span>
              </NavDropdown.Item>
            </NavDropdown>

            <Nav.Link onClick={(e) => handleNavLinkClick(e, "/home#about-us", "about-us")} className="mt-2 me-4 nav-hover-pill">
              About us
            </Nav.Link>
            
            <Nav.Link onClick={(e) => handleNavLinkClick(e, "/home#faqs", "faqs")} className="mt-2 me-4 nav-hover-pill">
              FAQs
            </Nav.Link>
            
            <Nav className="ms-auto">
              {AUTH_BYPASS ? (
                <Nav.Link as={Link} to="/dashboard" className="mt-3 me-4 nav-hover-pill">
                  Dashboard
                </Nav.Link>
              ) : userLoggedIn ? (
                <>
                  <Nav.Link as={Link} to="/dashboard" className="mt-3 me-4 nav-hover-pill">
                    Dashboard
                  </Nav.Link>
                  <Button variant="danger" className="fw-bold mt-2" onClick={handleLogout} >
                    Logout
                  </Button>
                </>
              ) : (
                <Button variant="success" className="fw-bold mt-2 glow-btn" onClick={() => setShowLoginModal(true)}>
                  Login
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <LoginModal 
        show={showLoginModal} 
        onHide={() => setShowLoginModal(false)} 
        switchToSignup={handleSwitchToSignup}
        switchToForgotPassword={handleSwitchToForgotPassword}
        showToast={showToast}
      />
      <SignupModal 
        show={showSignupModal} 
        onHide={() => setShowSignupModal(false)} 
        switchToLogin={handleSwitchToLogin} 
      />
      <ForgotPasswordModal
        show={showForgotPasswordModal}
        onHide={() => setShowForgotPasswordModal(false)}
        switchToLogin={handleSwitchToLogin}
      />
    </>
  );
}

export default Header;
