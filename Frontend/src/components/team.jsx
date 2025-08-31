//team.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Github, Users, Code, Palette } from 'lucide-react';
import devangImg from '../assets/devang_singh.jpg';
import dhruvImg from '../assets/dhruv_sharma.jpg';
import kunalImg from '../assets/kunal_sharma.jpg';
import purabImg from '../assets/purab.jpg';
import Navbar from "./Navbar";


// Floating elements for background decoration (same as landing)
const FloatingElement = ({ children, delay = 0, duration = 3 }) => (
  <motion.div
    animate={{
      y: [-10, 10, -10],
      rotate: [-2, 2, -2],
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  >
    {children}
  </motion.div>
);

// Enhanced Team Member Card Component with Landing UI styling
// Enhanced Team Member Card Component with Landing UI styling
const TeamMemberCard = ({ member, delay = 0 }) => {
  const getRoleIcon = (role) => {
    switch (role.toLowerCase()) {
      case 'full stack developer':
        return <Code className="w-4 h-4 text-white" />;
      case 'frontend developer':
        return <Palette className="w-4 h-4 text-white" />;
      default:
        return <Users className="w-4 h-4 text-white" />;
    }
  };

  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
    >
      {/* Glow effect behind card */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-3xl blur-xl transform scale-105 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Main card */}
      <div className="relative bg-white/60 backdrop-blur-sm border border-white/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
        {/* Profile Image */}
        <div className="w-40 h-40 mx-auto mb-6 relative">
          {/* Image glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-lg scale-110"></div>

          <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-gradient-to-r from-amber-500 to-orange-500 shadow-xl">
            {member.image ? (
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Role icon badge */}
          <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
            {getRoleIcon(member.role)}
          </div>
        </div>

        {/* Member Info */}
        <div className="text-center mb-6 space-y-2">
          <h3 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
            {member.name}
          </h3>
          <div className="w-16 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 mx-auto rounded-full"></div>
          <p className="text-gray-600 font-medium flex items-center justify-center gap-2">
            <Code className="w-4 h-4" />
            {member.role}
          </p>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-4">
          <motion.a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-[#0077b5] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-200/50"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Linkedin size={20} />
          </motion.a>
          <motion.a
            href={member.github}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-gray-900 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-200/50"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Github size={20} />
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
};

// Main Team Component with Landing UI styling
const Team = ({ }) => {
  const teamMembers = [
    {
      name: "Kunal Sharma",
      role: "Full Stack Developer",
      linkedin: "https://www.linkedin.com/in/kunal-sharma-8b9787334/",
      github: "https://github.com/KunnuSherry",
      image: kunalImg
    },
    {
      name: "Dhruv Sharma",
      role: "Full Stack Developer",
      linkedin: "https://www.linkedin.com/in/dhruv-sharma-331379154/",
      github: "https://github.com/dhruv0050",
      image: dhruvImg
    },
    {
      name: "Devang Singh",
      role: "Full Stack Developer",
      linkedin: "https://www.linkedin.com/in/devang-singh-258476284/",
      github: "https://github.com/devang9890",
      image: devangImg
    },
    {
      name: "Purab",
      role: "Full Stack Developer",
      linkedin: "https://www.linkedin.com/in/purab-nigam-48a31326b",
      github: "https://github.com/Purabnigam123",
      image: purabImg
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Enhanced background elements (same as landing) */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft gradient orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl"></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-20 right-1/4">
          <FloatingElement delay={0}>
            <div className="w-6 h-6 bg-gradient-to-br from-amber-400/30 to-orange-400/30 rounded-lg rotate-45"></div>
          </FloatingElement>
        </div>
        <div className="absolute bottom-1/3 left-10">
          <FloatingElement delay={1} duration={4}>
            <div className="w-4 h-4 bg-gradient-to-br from-yellow-400/30 to-amber-400/30 rounded-full"></div>
          </FloatingElement>
        </div>
        <div className="absolute top-1/3 left-1/3">
          <FloatingElement delay={2} duration={5}>
            <div className="w-8 h-2 bg-gradient-to-r from-orange-400/30 to-red-400/30 rounded-full"></div>
          </FloatingElement>
        </div>
        <div className="absolute bottom-40 right-1/3">
          <FloatingElement delay={3} duration={6}>
            <div className="w-5 h-5 bg-gradient-to-br from-red-400/30 to-pink-400/30 rounded-lg rotate-12"></div>
          </FloatingElement>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <motion.div
            className="text-center mb-16 space-y-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div>
              <h1 className="text-7xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent font-serif leading-tight">
                Meet Our Team
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto mb-8"></div>
            </div>
            
            <motion.p
              className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-600 leading-relaxed font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              The dedicated developers behind{' '}
              <span className="font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                innovative solutions
              </span>{' '}
              and cutting-edge technology
            </motion.p>
          </motion.div>

          {/* Enhanced Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {teamMembers.map((member, index) => (
              <TeamMemberCard
                key={member.name}
                member={member}
                delay={0.2 + index * 0.1}
              />
            ))}
          </div>

          {/* Additional decorative section */}
          <motion.div
            className="relative py-16 mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 flex justify-center items-center">
              <div className="w-96 h-24 bg-gradient-to-r from-amber-200/10 to-orange-200/10 rounded-full blur-xl"></div>
            </div>

            {/* Subtitle */}
            <motion.p
              className="text-center text-lg text-gray-600 font-light max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.8 }}
            >
              Together, we're building the future of intelligent traffic management systems
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Team;