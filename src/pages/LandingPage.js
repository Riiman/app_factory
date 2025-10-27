import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRocket, FaLightbulb, FaChartLine, FaUsers } from 'react-icons/fa';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

const handleStartApplication = () => {
  navigate('/signup');
};

const handleLogin = () => {
  navigate('/login');
};


  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <FaLightbulb className="logo-icon" />
            <span>Turning Ideas App Factory</span>
          </div>
          <button className="login-btn" onClick={handleLogin}>
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Transform Your Startup Vision Into Reality</h1>
          <p className="hero-subtitle">
            Join India's premier startup incubator specializing in SaaS and AI ventures. 
            We provide technical development, strategic guidance, and go-to-market expertise 
            to accelerate your journey from idea to market leader.
          </p>
          <button className="cta-button" onClick={handleStartApplication}>
            Start Your Application
          </button>
        </div>
        <div className="hero-image">
          <div className="hero-placeholder">
            <FaRocket className="hero-icon" />
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="features-section">
        <h2 className="section-title">What We Offer</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FaRocket />
            </div>
            <h3>Technical Development</h3>
            <p>
              Full-stack development support from MVP to scaling. Our expert team helps 
              build robust, scalable products using cutting-edge technologies.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaChartLine />
            </div>
            <h3>GTM Strategy</h3>
            <p>
              Comprehensive go-to-market planning tailored to your target audience. 
              We help you identify the right channels and messaging for success.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaUsers />
            </div>
            <h3>Mentorship & Network</h3>
            <p>
              Access to experienced mentors, industry experts, and investor connections. 
              Leverage our network to accelerate your growth trajectory.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaLightbulb />
            </div>
            <h3>Product Innovation</h3>
            <p>
              UI/UX design, product strategy, and innovation consulting to ensure 
              your product delivers exceptional user experience and market fit.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-section">
        <h2 className="section-title">Why Choose Turning Ideas?</h2>
        <div className="why-content">
          <div className="why-item">
            <h3>🎯 Specialized Focus</h3>
            <p>
              We focus exclusively on SaaS and AI startups, providing domain-specific 
              expertise that generic incubators can't match.
            </p>
          </div>
          <div className="why-item">
            <h3>🚀 Technical Excellence</h3>
            <p>
              Our in-house development team can turn your vision into production-ready 
              products using modern tech stacks and best practices.
            </p>
          </div>
          <div className="why-item">
            <h3>📊 Data-Driven Approach</h3>
            <p>
              We use comprehensive evaluation frameworks to understand your startup's 
              unique needs and craft tailored support strategies.
            </p>
          </div>
          <div className="why-item">
            <h3>🤝 Long-Term Partnership</h3>
            <p>
              Beyond incubation, we provide ongoing support, connections, and resources 
              to help you scale and succeed in the long run.
            </p>
          </div>
        </div>
      </section>

      {/* Our Process */}
      <section className="process-section">
        <h2 className="section-title">Our Incubation Process</h2>
        <div className="process-timeline">
          <div className="process-step">
            <div className="step-number">1</div>
            <h3>Application</h3>
            <p>Submit your comprehensive startup evaluation form</p>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="step-number">2</div>
            <h3>Evaluation</h3>
            <p>Our team reviews your technical and business potential</p>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="step-number">3</div>
            <h3>Onboarding</h3>
            <p>Get matched with mentors and development resources</p>
          </div>
          <div className="process-arrow">→</div>
          <div className="process-step">
            <div className="step-number">4</div>
            <h3>Growth</h3>
            <p>Build, iterate, and scale with our support</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Turn Your Idea Into a Successful Startup?</h2>
        <p>Join our community of innovative founders building the future</p>
        <button className="cta-button-secondary" onClick={handleStartApplication}>
          Apply Now
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Turning Ideas App Factory</h4>
            <p>Empowering startups to build transformative products</p>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>Email: hello@turningideas.in</p>
            <p>Phone: +91 98765 43210</p>
          </div>
          <div className="footer-section">
            <h4>Location</h4>
            <p>Bangalore, Karnataka</p>
            <p>India</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Turning Ideas App Factory. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
