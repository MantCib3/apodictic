import React from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'isomorphic-dompurify';

const ArticleCard = ({ article, type = 'standard' }) => {
  if (!article) return null;
  
  // Sanitize potentially unsafe data
  const sanitize = (content) => {
    return content ? DOMPurify.sanitize(content, { ALLOWED_TAGS: [] }) : '';
  };

  const { id, title, date, lead, image } = article;
  
  // Sanitize all user-generated content
  const sanitizedTitle = sanitize(title);
  const sanitizedLead = sanitize(lead);
  const sanitizedImage = image ? encodeURI(image) : '';
  
  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date';

  let className, content;
  switch (type) {
    case 'feature':
      className = 'feature-article';
      content = (
        <div className="feature-text">
          <h1>{sanitizedTitle}</h1>
          <div className="date">{formattedDate}</div>
          <p>{sanitizedLead}</p>
        </div>
      );
      break;
    case 'event':
      className = 'event';
      content = (
        <div className="event-content">
          <h4>{sanitizedTitle}</h4>
          <div className="date">{formattedDate}</div>
          <p>{sanitizedLead}</p>
        </div>
      );
      break;
    case 'related':
      className = 'related-article-card';
      content = (
        <div className="related-article-text">
          <h3 className="related-article-title">{sanitizedTitle}</h3>
          <div className="related-article-date">{formattedDate}</div>
          <p className="related-article-lead">{sanitizedLead}</p>
        </div>
      );
      break;
    default:
      className = 'article';
      content = (
        <div className="article-content">
          <h3>{sanitizedTitle}</h3>
          <div className="date">{formattedDate}</div>
          <p>{sanitizedLead}</p>
        </div>
      );
  }

  const imageContainerClass = type === 'standard' ? 'article-image-container' : `${type}-image-container`;
  const fallbackImage = '/assets/logo.png';

  return (
    <Link to={`/article/${id}`} className={className}>
      <div 
        className={imageContainerClass} 
        style={{ 
          backgroundImage: `url(${sanitizedImage || fallbackImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {content}
    </Link>
  );
};

const MemoizedArticleCard = React.memo(ArticleCard);
export default MemoizedArticleCard;