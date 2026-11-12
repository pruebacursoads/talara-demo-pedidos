import { Link } from 'react-router-dom'
import { reiniciarDemo } from '../lib/store'

export function BannerDemo() {
  return (
    <div className="banner-demo">
      <span>DEMO · datos de prueba guardados en este navegador · precios referenciales</span>
      <Link to="/">Web del cliente</Link>
      <Link to="/intranet">Intranet</Link>
      <button type="button" onClick={() => reiniciarDemo()}>Reiniciar datos</button>
    </div>
  )
}
