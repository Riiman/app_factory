import React, { FC } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { LightbulbIcon, RocketIcon, ChartBarIcon, DollarIcon } from '../components/Icons';

const HomePage: FC = () => {
  const features = [
    {
      icon: <LightbulbIcon className="text-blue-600" />,
      title: 'Validate & Refine',
      description: 'Don\'t just have an idea. Have a validated one. Our tools and community help you refine your concept for maximum market fit.',
    },
    {
      icon: <RocketIcon className="text-blue-600" />,
      title: 'Build & Launch',
      description: 'From wireframes to a working MVP. Access our network of developers, designers, and mentors to bring your product to life.',
    },
    {
      icon: <ChartBarIcon className="text-blue-600" />,
      title: 'Grow & Scale',
      description: 'Acquire your first users and find your growth engine. We provide the strategies and analytics to scale effectively.',
    },
    {
      icon: <DollarIcon className="text-blue-600" />,
      title: 'Fund & Succeed',
      description: 'Get investor-ready. We connect you with our network of VCs and angel investors to secure the funding you need to win.',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Turn Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-pink-500">Vision</span> into a Venture.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-gray-600">
            StartupOS is the ultimate platform to validate, build, and fund your next big idea. We're your co-founder from day one.
          </p>
          <div className="mt-10">
            <Link to="/signup">
              <Button className="px-8 py-4 text-lg">
                Start Building For Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Your Startup Journey, Accelerated</h2>
            <p className="mt-2 text-lg text-gray-600">From a spark of genius to a funded company.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonial Section */}
      <section className="py-20 bg-gray-800 text-white">
        <div className="container mx-auto px-4 text-center">
            <img src="https://media.licdn.com/dms/image/v2/C4E03AQG1GCzMhKzS4g/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1602611251385?e=2147483647&v=beta&t=6N-VTumO4LzNOmQ03HO-CcXwEHoNuCAZQf9GvHFRsl4" alt="Hitanshu G" className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-500" />
            <blockquote className="max-w-3xl mx-auto">
                <p className="text-xl md:text-2xl italic">"StartupOS was instrumental in our seed round. They're more than a platform; they're a partner. The guidance and network access were invaluable."</p>
                <footer className="mt-4 text-lg font-semibold text-pink-400">- Hitanshu Goyal, CEO of BidYourStay</footer>
            </blockquote>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Ready to ignite your idea?</h2>
          <p className="mt-2 text-lg text-gray-600">Join hundreds of founders building the future on StartupOS.</p>
          <div className="mt-8">
            <Link to="/signup">
              <Button className="px-8 py-4 text-lg">
                Join Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
