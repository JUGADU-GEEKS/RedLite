import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Zap, TrendingUp } from 'lucide-react';
import Navbar from "./Navbar";

const steps = [
  {
    title: 'Live Video Input',
    desc: 'Government provides live video feeds or pre-recorded videos from 4 directions (lanes).',
    icon: <BarChart3 className="w-7 h-7 text-red-500" />,
    color: 'from-red-500 to-orange-400',
  },
  {
    title: 'Vehicle Detection (YOLO + OpenCV)',
    desc: 'Each video is processed individually to count vehicles using YOLOv5. Frames are sent to FastAPI backend for real-time inference.',
    icon: <Clock className="w-7 h-7 text-orange-500" />,
    color: 'from-orange-400 to-yellow-400',
  },
  {
    title: 'Traffic Logic Controller (Node.js)',
    desc: 'Gets vehicle counts from FastAPI, applies logic to decide which lane gets green, ensures only one lane is green at a time.',
    icon: <TrendingUp className="w-7 h-7 text-yellow-500" />,
    color: 'from-yellow-400 to-green-400',
  },
  {
    title: 'Signal Update to Arduino',
    desc: 'Sends control signals to Arduino via Wi-Fi (ESP8266). Arduino turns on respective LEDs for the selected lane.',
    icon: <Zap className="w-7 h-7 text-green-500" />,
    color: 'from-green-400 to-blue-400',
  },
  {
    title: 'Frontend Display (React)',
    desc: 'Shows current signal status, vehicle counts, and lane camera feed. Admin can also override in case of emergency.',
    icon: <BarChart3 className="w-7 h-7 text-blue-500" />,
    color: 'from-blue-400 to-purple-400',
  },
];

const HowItWorks = ({ darkMode }) => {
  return (
    <div className={`min-h-screen py-20 px-4 ${darkMode ? 'bg-[#171418] text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-500`}> 
      <div className="max-w-4xl mx-auto">
        <motion.h1
          className="text-4xl md:text-5xl font-bold mb-6 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          How Does the Project Work?
        </motion.h1>
        <motion.p
          className={`text-lg mb-12 text-center max-w-2xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Our smart traffic system uses computer vision, IoT, and real-time logic to optimize traffic flow and safety. Here's a step-by-step overview:
        </motion.p>
        <div className="relative pl-8">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-500 via-orange-400 to-yellow-400 rounded-full" />
          {steps.map((step, idx) => (
            <motion.div
              key={step.title}
              className={`flex items-start space-x-4 p-6 mb-6 rounded-xl shadow-lg relative ${darkMode ? 'bg-[#231E24]' : 'bg-white'}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${step.color} shadow-md absolute -left-16 top-1/2 -translate-y-1/2`}>
                {step.icon}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className={`text-base ${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Tech Stack & Traffic Logic */}
      <div className="grid md:grid-cols-2 gap-8 mt-16 max-w-4xl mx-auto">
        {/* Tech Stack */}
        <motion.div
          className={`${darkMode ? 'bg-[#231E24] border-red-900/30' : 'bg-white border-gray-200'} border rounded-xl p-8 shadow-xl backdrop-blur-sm`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🏗️ Tech Stack</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Frontend:</span>
              <span className="text-blue-500 font-semibold">React.js</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Backend (AI):</span>
              <span className="text-green-500 font-semibold">FastAPI + YOLOv5 + OpenCV</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Logic Controller:</span>
              <span className="text-yellow-500 font-semibold">Node.js + Express</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Hardware:</span>
              <span className="text-red-500 font-semibold">Arduino UNO + ESP8266 Wi-Fi</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Communication:</span>
              <span className="text-orange-500 font-semibold">HTTP/WebSocket</span>
            </div>
          </div>
        </motion.div>
        {/* Traffic Logic Rules */}
        <motion.div
          className={`${darkMode ? 'bg-[#231E24] border-red-900/30' : 'bg-white border-gray-200'} border rounded-xl p-8 shadow-xl backdrop-blur-sm`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🔁 Traffic Logic Rules</h3>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-[#2a232b]' : 'bg-gray-50'}`}> 
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Core Rule:</h4>
              <p className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} text-sm`}>Only <strong>1 lane</strong> can have a green signal at any given time</p>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-[#2a232b]' : 'bg-gray-50'}`}> 
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>Priority Logic:</h4>
              <div className={`${darkMode ? 'bg-[#231E24]' : 'bg-white'} p-3 rounded font-mono text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{`if (laneA > laneB && laneA > laneC && laneA > laneD) {\n    green = A\n}`}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HowItWorks; 