export default function PageTransition({ children, phase = 'enter' }) {
  return <div className={`page-transition page-${phase}`}>{children}</div>
}
