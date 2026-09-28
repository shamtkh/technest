import { Link } from 'react-router-dom'

// Admin-set links (e.g. hero banners) may point off-site.
export default function SmartLink({ to, ...props }) {
  return /^https?:\/\//i.test(to) ? <a href={to} target="_blank" rel="noreferrer" {...props} /> : <Link to={to} {...props} />
}
