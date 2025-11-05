
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../config/constants';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate(ROUTES.DASHBOARD);
    } else {
      navigate(ROUTES.SIGNUP);
    }
  };

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="home-nav">
        <div className="container">
          <div className="nav-content">
            <div className="logo">
              <h2>Turning Idea</h2>
            </div>
            <div className="nav-links">
              {user ? (
                <Link to={ROUTES.DASHBOARD} className="nav-btn primary">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to={ROUTES.LOGIN} className="nav-btn">
                    Login
                  </Link>
                  <Link to={ROUTES.SIGNUP} className="nav-btn primary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Transform Your Startup Idea Into Reality
            </h1>
            <p className="hero-subtitle">
              Join our business incubator program and get the support, resources, 
              and mentorship you need to build a successful startup.
            </p>
            <div className="hero-actions">
              <button onClick={handleGetStarted} className="cta-button">
                Get Started
              </button>
              <Link to="#features" className="secondary-button">
                Learn More
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-illustration">
              <div className="illustration-circle"></div>
              <div className="illustration-dots"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose Turning Idea?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Easy Application</h3>
              <p>
                Submit your startup idea through our simple, guided application process.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Documents</h3>
              <p>
                Generate professional pitch decks, business plans, and financial models instantly.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Expert Mentorship</h3>
              <p>
                Get guidance from experienced entrepreneurs and industry experts.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Funding Support</h3>
              <p>
                Access funding opportunities and investor connections.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Progress Tracking</h3>
              <p>
                Monitor your startup's growth with comprehensive analytics and insights.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Community Network</h3>
              <p>
                Connect with fellow entrepreneurs and build valuable partnerships.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Sign Up</h3>
              <p>Create your account and verify your email</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Submit Your Idea</h3>
              <p>Fill out our comprehensive application form</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Reviewed</h3>
              <p>Our team evaluates your startup concept</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Join Program</h3>
              <p>Receive feedback and begin your journey</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <h2 className="section-title">What Our Startups Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p>"This incubator helped us turn our idea into a viable business. The mentorship was invaluable."</p>
              <div className="testimonial-author">
                <strong>Sarah Johnson</strong>
                <span>Founder, TechStart</span>
              </div>
            </div>
            <div className="testimonial-card">
              <p>"The AI tools saved us countless hours of work. We generated our business plan in just one day."</p>
              <div className="testimonial-author">
                <strong>Michael Chen</strong>
                <span>CEO, InnovateX</span>
              </div>
            </div>
            <div className="testimonial-card">
              <p>"The funding connections led to our first investment round. Couldn't have done it without them."</p>
              <div className="testimonial-author">
                <strong>Emma Rodriguez</strong>
                <span>Co-founder, GrowthLab</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Turn Your Idea Into Reality?</h2>
            <p>Join hundreds of startups already building their future with us.</p>
            <button onClick={handleGetStarted} className="cta-button large">
              Start Your Journey Today
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <h2>Turning Idea</h2>
            </div>
            <div className="footer-links">
              <Link to={ROUTES.HOME}>Home</Link>
              <Link to={ROUTES.ABOUT}>About</Link>
              <Link to={ROUTES.CONTACT}>Contact</Link>
              <Link to={ROUTES.PRIVACY}>Privacy Policy</Link>
            </div>
            <div className="footer-social">
              <a href="/#" aria-label="Twitter">🐦</a>
              <a href="/#" aria-label="LinkedIn">💼</a>
              <a href="/#" aria-label="Instagram">📸</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2023 Turning Idea. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
