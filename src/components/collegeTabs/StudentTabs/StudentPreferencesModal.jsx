import React, { useState } from 'react';
import { X, Sparkles, Check, GraduationCap, BookOpen } from 'lucide-react';
import { STUDENT_COURSES, STUDENT_TOPICS, saveStudentPreferences } from '../../../utils/studentRecommendations';

export function StudentPreferencesModal({ isOpen, onClose, currentPreferences, onSaved }) {
  const [selectedCourse, setSelectedCourse] = useState(currentPreferences?.course || "");
  const [selectedTopics, setSelectedTopics] = useState(currentPreferences?.favorite_topics || []);
  const [courseSearch, setCourseSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("topics"); // "topics" | "course"

  if (!isOpen) return null;

  const toggleTopic = (topicId) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveStudentPreferences({
      course: selectedCourse,
      favorite_topics: selectedTopics,
    });
    setSaving(false);

    if (result.success) {
      if (onSaved) onSaved({ course: selectedCourse, favorite_topics: selectedTopics });
      onClose();
    } else {
      alert("Failed to save preferences. Please try again.");
    }
  };

  const filteredCourses = STUDENT_COURSES.filter(
    (c) =>
      c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.dept.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Reading Preferences & Course
              </h2>
              <p className="text-xs text-slate-500">
                Personalize your "Recommended for You" book collection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("topics")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "topics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Favorite Topics ({selectedTopics.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("course")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "course"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Academic Course {selectedCourse && `(${selectedCourse})`}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 scrollbar-thin">
          {activeTab === "topics" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Select topics and genres you enjoy reading:
                </p>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {selectedTopics.length} selected
                </span>
              </div>

              {/* Topics Grid with Pictures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STUDENT_TOPICS.map((topic) => {
                  const isSelected = selectedTopics.includes(topic.id);
                  return (
                    <div
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={`group relative flex h-32 overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-sm ${
                        isSelected
                          ? "border-blue-600 shadow-lg ring-4 ring-blue-500/25 scale-[1.01]"
                          : "border-slate-200/90 hover:border-blue-400 hover:shadow-md"
                      }`}
                    >
                      {/* Topic Photo */}
                      <img
                        src={topic.image}
                        alt={topic.title}
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-500"
                        loading="eager"
                      />
                      {/* Rich aesthetic gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

                      {/* Content Overlay */}
                      <div className="relative z-10 flex flex-col justify-between p-3.5 w-full">
                        <div className="flex items-center justify-between">
                          <span className="rounded-lg bg-black/60 border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-xs">
                            {topic.badge}
                          </span>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-md ring-2 ring-white/80"
                                : "border-2 border-white/70 bg-black/40 backdrop-blur-md text-transparent"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white leading-tight drop-shadow-md">
                            {topic.title}
                          </h4>
                          <p className="text-[11px] font-medium text-white/90 truncate mt-0.5 drop-shadow-xs">
                            {topic.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "course" && (
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Search course or program (e.g. BSIT, Nursing)..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {filteredCourses.map((c) => {
                  const isSelected = selectedCourse === c.code || selectedCourse === c.name;
                  return (
                    <div
                      key={c.code}
                      onClick={() => setSelectedCourse(c.code)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                            {c.code}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {c.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {c.dept}
                        </p>
                      </div>

                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ml-3 ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "border border-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:px-6">
          <p className="text-[11px] text-slate-500">
            {selectedTopics.length === 0
              ? "Tip: Choose at least 1 topic"
              : `${selectedTopics.length} topic${selectedTopics.length > 1 ? "s" : ""} selected`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentPreferencesModal;
