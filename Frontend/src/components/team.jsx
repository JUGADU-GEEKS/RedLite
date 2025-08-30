//team.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Github, Users, Code, Palette } from 'lucide-react';
import devangImg from '../assets/devang_singh.jpg';
import dhruvImg from '../assets/dhruv_sharma.jpg';
import kunalImg from '../assets/kunal_sharma.jpg';
// import sakshiImg from '../assets/sakshi_singh.jpg';
// import sangyaImg from '../assets/sangya_ojha.jpg';
import purabImg from '../assets/purab.jpg';
import Navbar from "./Navbar";

// Team Member Card Component
const TeamMemberCard = ({ member, delay = 0 }) => {
  const getRoleIcon = (role) => {
    switch (role.toLowerCase()) {
      case 'full stack developer':
        return <Code className="w-4 h-4" />;
      case 'frontend developer':
        return <Palette className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className="bg-white border border-gray-200 backdrop-blur-sm rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-300"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -5, scale: 1.02 }}
    >
      <div className="relative">
        {/* Profile Image */}
        <div className="w-40 h-40 mx-auto mb-4 relative">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-gradient-to-r from-red-500 to-orange-400 shadow-lg">
            <img
              src={member.image}
              alt={member.name}
              className={`w-full h-full object-cover transition-transform duration-300 hover:scale-110 ${
                member.name === 'Sangya Ojha' ? 'scale-150' : ''
              }`}
            />
          </div>
          <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-r from-red-500 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
            {getRoleIcon(member.role)}
          </div>
        </div>

        {/* Member Info */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold mb-1 text-gray-900">{member.name}</h3>
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
            {getRoleIcon(member.role)}
            {member.role}
          </p>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-3">
          <motion.a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-[#0077b5] hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Linkedin size={18} />
          </motion.a>
          <motion.a
            href={member.github}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-900 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Github size={18} />
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
};

// Main Team Component
const Team = ({ onHowItWorksClick, onHomeClick, onDashboardClick, onMapClick, onTeamClick }) => {
  const teamMembers = [
    {
      name: "Kunal Sharma",
      role: "Full Stack Developer",
      image: kunalImg,
      linkedin: "https://www.linkedin.com/in/kunal-sharma-8b9787334/",
      github: "https://github.com/KunnuSherry"
    },
    {
      name: "Dhruv Sharma",
      role: "Full Stack Developer",
      image: dhruvImg,
      linkedin: "https://www.linkedin.com/in/dhruv-sharma-331379154/",
      github: "https://github.com/dhruv0050"
    },
    // {
    //   name: "Sangya Ojha",
    //   role: "Full Stack Developer",
    //   image: sangyaImg,
    //   linkedin: "https://www.linkedin.com/in/sangya-ojha-7a58a22a3/",
    //   github: "https://github.com/sangya-25"
    // },
    {
      name: "Devang Singh",
      role: "Full Stack Developer",
      image: devangImg,
      linkedin: "https://www.linkedin.com/in/devang-singh-258476284/",
      github: "https://github.com/devang9890"
    },
    {
      name: "Purab",
      role: "Full Stack Developer",
      image: purabImg,
      linkedin: "https://www.linkedin.com/in/purab-nigam-48a31326b",
      github: "https://github.com/Purabnigam123"
    }
    // {
    //   name: "Sakshi Singh",
    //   role: "Full Stack Developer",
    //   image: sakshiImg,
    //   linkedin: "https://www.linkedin.com/in/sakshi-singh-5176b9373",
    //   github: "http://GitHub.com/sakshisingh85"
    // }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-gray-50">
      <Navbar
        onHowItWorksClick={onHowItWorksClick}
        onHomeClick={onHomeClick}
        onDashboardClick={onDashboardClick}
        onMapClick={onMapClick}
        onTeamClick={onTeamClick}
      />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
              Meet Our Team
            </h1>
            <p className="text-xl max-w-3xl mx-auto text-gray-600">
              The dedicated developers behind innovative solutions and cutting-edge technology
            </p>
          </motion.div>

          {/* Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {teamMembers.map((member, index) => (
              <TeamMemberCard
                key={member.name}
                member={member}
                delay={0.2 + index * 0.1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;