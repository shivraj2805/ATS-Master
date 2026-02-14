import { ExternalLink, Github, Linkedin, Code, Globe, Mail, Link as LinkIcon } from 'lucide-react';

export default function ExtractedLinks({ links }) {
  // Debug logging
  console.log('ExtractedLinks received:', links);
  
  // Check if links exist and have any data
  if (!links) {
    console.log('No links data provided');
    return null;
  }
  
  // Calculate total links from all categories
  const calculatedTotal = (
    (links.github?.length || 0) +
    (links.linkedin?.length || 0) +
    (links.leetcode?.length || 0) +
    (links.portfolio?.length || 0) +
    (links.email?.length || 0) +
    (links.other?.length || 0)
  );
  
  // Don't render if no links found
  if (calculatedTotal === 0) {
    console.log('No links found in any category');
    return null;
  }

  // Get display text for a URL (anchor text from resume)
  const getDisplayText = (url) => {
    if (links.links_with_text && links.links_with_text[url]) {
      return links.links_with_text[url];
    }
    // Fallback: clean up the URL for display
    return formatLink(url);
  };

  const linkCategories = [
    {
      key: 'github',
      label: 'GitHub',
      icon: Github,
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      links: links.github || []
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: Linkedin,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      links: links.linkedin || []
    },
    {
      key: 'leetcode',
      label: 'LeetCode',
      icon: Code,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      links: links.leetcode || []
    },
    {
      key: 'portfolio',
      label: 'Portfolio',
      icon: Globe,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      links: links.portfolio || []
    },
    {
      key: 'email',
      label: 'Email',
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      links: links.email || []
    },
    {
      key: 'other',
      label: 'Other Links',
      icon: LinkIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      links: links.other || []
    }
  ];

  const activeLinkCategories = linkCategories.filter(category => category.links.length > 0);

  if (activeLinkCategories.length === 0) {
    return null;
  }

  const formatLink = (link) => {
    if (link.startsWith('mailto:')) {
      return link.replace('mailto:', '');
    }
    return link;
  };

  const handleLinkClick = (link) => {
    if (link.startsWith('mailto:')) {
      window.location.href = link;
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <ExternalLink className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Extracted Links</h2>
          <p className="text-sm text-gray-600">
            {calculatedTotal} {calculatedTotal === 1 ? 'link' : 'links'} found in your resume
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeLinkCategories.map((category) => (
          <div
            key={category.key}
            className={`p-4 rounded-lg border-2 ${category.bgColor} ${category.borderColor} transition-all hover:shadow-md`}
          >
            <div className="flex items-center gap-2 mb-3">
              <category.icon className={`w-5 h-5 ${category.color}`} />
              <h3 className={`font-semibold ${category.color}`}>
                {category.label}
              </h3>
              <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${category.bgColor} ${category.color}`}>
                {category.links.length}
              </span>
            </div>

            <div className="space-y-2">
              {category.links.map((link, index) => {
                const displayText = getDisplayText(link);
                const cleanUrl = formatLink(link);
                
                return (
                  <button
                    key={index}
                    onClick={() => handleLinkClick(link)}
                    className={`w-full text-left px-3 py-2 rounded-md ${category.bgColor} ${category.color} 
                      hover:bg-opacity-80 transition-all flex items-start gap-2 group border border-transparent hover:border-current`}
                    title={`Click to open: ${cleanUrl}`}
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {displayText}
                      </div>
                      {displayText !== cleanUrl && (
                        <div className="text-xs opacity-75 truncate mt-0.5">
                          {cleanUrl}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 justify-center">
          {activeLinkCategories.map((category) => (
            <div
              key={`stat-${category.key}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${category.bgColor} ${category.borderColor} border`}
            >
              <category.icon className={`w-4 h-4 ${category.color}`} />
              <span className={`text-sm font-medium ${category.color}`}>
                {category.links.length} {category.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          Pro Tip
        </h4>
        <p className="text-sm text-blue-800">
          {activeLinkCategories.some(cat => cat.key === 'github') && (
            <>Including your GitHub profile helps recruiters see your code and projects. </>
          )}
          {activeLinkCategories.some(cat => cat.key === 'portfolio') && (
            <>Your portfolio showcases your work - make sure it's up to date! </>
          )}
          {!activeLinkCategories.some(cat => cat.key === 'linkedin') && (
            <>Consider adding a LinkedIn profile link to increase your professional visibility. </>
          )}
        </p>
      </div>
    </div>
  );
}
