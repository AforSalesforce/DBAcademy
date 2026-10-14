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
  /** Called once when the last answer is in, with the score as a percentage. */
  onComplete: (score: number) => void;
  /** Leave the results screen and go back to the lesson. */
  onContinue: () => void;
  /** Passing marks the lesson complete (lessons without a challenge). */
  completesLesson?: boolean;
}

export const Quiz: React.FC<QuizProps> = ({ title, questions, onComplete, onContinue, completesLesson = true }) => {
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
      const finalScore = Math.round((score / questions.length) * 100);
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
      <div className="p-6 text-center" role="status">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${passed ? 'bg-success/20' : 'bg-danger/20'}`}>
          {passed ? (
            <Trophy className="w-8 h-8 text-success" />
          ) : (
            <RotateCcw className="w-8 h-8 text-danger" />
          )}
        </div>
        <h3 className="text-2xl font-bold mb-2">
          {passed ? 'Congratulations!' : 'Keep Practicing!'}
        </h3>
        <p className="text-muted mb-2">
          You scored <span className={`font-bold ${passed ? 'text-success' : 'text-danger'}`}>{score}/{questions.length}</span> ({percentage}%)
        </p>
        <p className="text-sm text-faint mb-6">
          {passed
            ? (completesLesson ? 'You passed, and this lesson is marked complete.' : 'You passed. Nice work.')
            : 'You need 70% to pass. Reread the lesson, then try again.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-card border border-white/10 text-ink rounded-lg hover:bg-card-hover transition-colors text-sm font-medium"
          >
            Retake quiz
          </button>
          <button
            onClick={onContinue}
            className={passed
              ? 'px-4 py-2 bg-success text-canvas rounded-lg hover:bg-success/90 transition-colors text-sm font-medium'
              : 'px-4 py-2 text-ink rounded-lg hover:bg-card transition-colors text-sm font-medium'}
          >
            {passed ? 'Continue' : 'Back to lesson'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="text-sm text-muted bg-card px-3 py-1 rounded-full">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-card rounded-full h-1.5 mb-6">
        <div
          className="bg-accent h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      <p className="text-base font-medium mb-5">{currentQuestion.question}</p>

      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctIndex;
          let borderClass = 'border-white/10 hover:border-white/15';
          let bgClass = 'bg-card/50';

          if (showExplanation) {
            if (isCorrect) {
              borderClass = 'border-success';
              bgClass = 'bg-success/10';
            } else if (isSelected && !isCorrect) {
              borderClass = 'border-danger';
              bgClass = 'bg-danger/10';
            }
          } else if (isSelected) {
            borderClass = 'border-accent';
            bgClass = 'bg-accent/10';
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={showExplanation}
              className={`w-full text-left p-4 rounded-lg border ${borderClass} ${bgClass} transition-all flex items-center gap-3`}
            >
              <span className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-xs font-medium shrink-0">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-sm">{option}</span>
              {showExplanation && isCorrect && <CheckCircle className="w-5 h-5 text-success ml-auto shrink-0" />}
              {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-danger ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="p-4 bg-card/50 border border-white/10 rounded-lg mb-4">
          <p className="text-sm text-ink">
            <span className="font-semibold text-accent">Explanation:</span> {currentQuestion.explanation}
          </p>
        </div>
      )}

      {showExplanation && (
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-canvas rounded-lg transition-colors text-sm font-medium ml-auto"
        >
          {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
