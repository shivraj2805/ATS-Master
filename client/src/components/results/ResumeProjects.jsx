import { Code, ExternalLink } from 'lucide-react';

export default function ResumeProjects({ projects }) {
  // Debug logging
  console.log('ResumeProjects received:', projects);
  
  // Check if projects exist and have any data
  if (!projects || projects.length === 0) {
    console.log('No projects data provided');
    return null;
  }

  return (
    <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-cyan-200/50 p-6 hover:shadow-xl transition-all duration-500 animate-slide-up animation-delay-400">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Code className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900">Resume Projects</h3>
          <p className="text-sm text-gray-600">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} found in your resume
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project, index) => (
          <div
            key={index}
            className="p-5 bg-gradient-to-br from-cyan-50 to-white border-2 border-cyan-200 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
          >
            {/* Project Header */}
            <div className="mb-3">
              <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-cyan-600 transition-colors">
                {project.name}
              </h4>
              
              {/* Technologies */}
              {project.technologies && project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.technologies.map((tech, techIndex) => (
                    <span
                      key={techIndex}
                      className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-md border border-cyan-200"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {project.description && (
              <p className="text-sm text-gray-700 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="mt-5 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
        <h4 className="text-sm font-bold text-cyan-900 mb-1 flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          Why Projects Matter
        </h4>
        <p className="text-sm text-cyan-800">
          Projects demonstrate your practical skills and initiative. They showcase your ability to apply 
          technical knowledge to real-world problems and highlight your hands-on experience.
        </p>
      </div>
    </div>
  );
}
