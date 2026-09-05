import { greetingForNow, displayNameFromStorage } from '../greeting'

interface OrbHeroProps {
  visible: boolean
}

export function OrbHero({ visible }: OrbHeroProps) {
  if (!visible) return null

  const name = displayNameFromStorage()
  const g = greetingForNow()

  return (
    <div className="hero-block">
      <div className="hero-orb-wrap">
        <div className="hero-orb" aria-hidden />
      </div>
      <h1 className="hero-greeting">
        {g}, {name}
      </h1>
      <p className="hero-sub">
        What is on <span className="hero-accent">your mind</span>?
      </p>
    </div>
  )
}
