import { AppRouter } from './app/router/AppRouter'
import { LanguageToggle } from './shared/components/LanguageToggle'

function App() {
  return (
    <>
      <LanguageToggle />
      <AppRouter />
    </>
  )
}

export default App
