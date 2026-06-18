'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizProps {
  title: string;
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

export const Quiz: React.FC<QuizProps> = ({ title, questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
    if (index === currentQuestion.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      const finalScore = Math.round(((score + (selectedAnswer === currentQuestion.correctIndex ? 0 : 0)) / questions.length) * 100);
      setCompleted(true);
      onComplete(finalScore);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="p-6 text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {passed ? (
            <Trophy className="w-8 h-8 text-green-400" />
          ) : (
            <RotateCcw className="w-8 h-8 text-red-400" />
          )}
        </div>
        <h3 className="text-2xl font-bold mb-2">
          {passed ? 'Congratulations!' : 'Keep Practicing!'}
        </h3>
        <p className="text-slate-400 mb-2">
          You scored <span className={`font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{score}/{questions.length}</span> ({percentage}%)
        </p>
        <p className="text-sm text-slate-500 mb-6">
          {passed ? 'You passed! Great work.' : 'You need 70% to pass. Try again!'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Retry Quiz
          </button>
          {passed && (
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      <p className="text-base font-medium mb-5">{currentQuestion.question}</p>

      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctIndex;
          let borderClass = 'border-slate-700 hover:border-slate-600';
          let bgClass = 'bg-slate-800/50';

          if (showExplanation) {
            if (isCorrect) {
              borderClass = 'border-green-500';
              bgClass = 'bg-green-500/10';
            } else if (isSelected && !isCorrect) {
              borderClass = 'border-red-500';
              bgClass = 'bg-red-500/10';
            }
          } else if (isSelected) {
            borderClass = 'border-blue-500';
            bgClass = 'bg-blue-500/10';
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={showExplanation}
              className={`w-full text-left p-4 rounded-lg border ${borderClass} ${bgClass} transition-all flex items-center gap-3`}
            >
              <span className="w-7 h-7 rounded-full border border-slate-600 flex items-center justify-center text-xs font-medium shrink-0">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-sm">{option}</span>
              {showExplanation && isCorrect && <CheckCircle className="w-5 h-5 text-green-400 ml-auto shrink-0" />}
              {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg mb-4">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-blue-400">Explanation:</span> {currentQuestion.explanation}
          </p>
        </div>
      )}

      {showExplanation && (
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium ml-auto"
        >
          {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
