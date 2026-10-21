import { ChangeEvent, useMemo, useState } from 'react'
import palette from './data/mard_221_reference.json'
import { buildPattern } from './engine'
import { download, exportZip } from './export'
import { renderPattern } from './render'
import type { Pattern } from './types'
import './style.css'

const number = (event: ChangeEvent<HTMLInputElement>) => Number(event.target.value)

export default function App() {
  const [width, setWidth] = useState(58), [height, setHeight] = useState(58), [colors, setColors] = useState(18)
  const [image, setImage] = useState<ImageData | null>(null), [pattern, setPattern] = useState<Pattern | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const preview = useMemo(() => {
    if (!pattern) return ''
    const scale = Math.max(5, Math.min(15, Math.floor(600 / Math.max(pattern.width, pattern.height))))
    return renderPattern(pattern, scale).toDataURL()
  }, [pattern])
  const load = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setError('请选择 JPG、PNG、WebP 等图片文件。'); return }
    const reader = new FileReader(); reader.onload = () => {
      const photo = new Image(); photo.onload = () => { const canvas = document.createElement('canvas'); canvas.width = photo.naturalWidth; canvas.height = photo.naturalHeight; canvas.getContext('2d')!.drawImage(photo, 0, 0); setImage(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)); setPattern(null); setError('') }; photo.onerror = () => setError('该图片无法读取。'); photo.src = String(reader.result)
    }; reader.readAsDataURL(file)
  }
  const generate = () => { if (!image) { setError('请先上传一张照片。'); return }; setPattern(buildPattern(image, width, height, colors, palette)); setError('') }
  const save = async () => { if (!pattern) return; setBusy(true); try { download(await exportZip(pattern), 'beadflow_pattern.zip') } catch { setError('导出失败，请重试。') } finally { setBusy(false) } }
  return <main>
    <header><p className="eyebrow">LOCAL-FIRST BEAD PATTERN MAKER</p><h1>BeadFlow</h1><p>把照片变成可真正制作的 MARD 拼豆图纸。</p><span>所有处理只在当前浏览器完成 · 无登录 · 无 API · 不上传照片</span></header>
    <section className="workspace">
      <aside className="controls"><h2>生成设置</h2><label className="upload">上传照片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={load} /></label>
        <div className="field"><label>网格宽度 <b>{width}</b> 格<input aria-label="网格宽度" type="range" min="10" max="180" value={width} onChange={(e) => setWidth(number(e))} /></label></div>
        <div className="field"><label>网格高度 <b>{height}</b> 格<input aria-label="网格高度" type="range" min="10" max="180" value={height} onChange={(e) => setHeight(number(e))} /></label></div>
        <div className="field"><label>最大色数 <b>{colors}</b> 色<input aria-label="最大色数" type="range" min="2" max="64" value={colors} onChange={(e) => setColors(number(e))} /></label></div>
        <button className="primary" onClick={generate}>生成拼豆图纸</button>{error && <p className="error" role="alert">{error}</p>}
        <p className="note">MARD 221 色库为带来源的屏幕参考值；所有色号在实物制作前仍需核验。</p>
      </aside>
      <section className="result"><div className="result-head"><div><p className="eyebrow">预览</p><h2>{pattern ? `${pattern.width} × ${pattern.height} 格` : '等待上传照片'}</h2></div>{pattern && <button onClick={save} disabled={busy}>{busy ? '正在打包…' : '下载 PNG · PDF · JSON · ZIP'}</button>}</div>
        {preview ? <img className="preview" src={preview} alt="生成的拼豆预览" /> : <div className="empty">上传图片后，选择尺寸和色数，即可在这里生成图纸。</div>}
      </section>
    </section>
    {pattern && <section className="details"><div><h2>材料清单</h2><p>{pattern.width * pattern.height} 颗 · {pattern.materials.length} 色 · {pattern.boards.length} 块 29×29 底板</p></div><div className="table-wrap"><table><thead><tr><th>色号</th><th>参考色</th><th>数量</th><th>状态</th></tr></thead><tbody>{pattern.materials.map((item) => <tr key={item.code}><td><i style={{ background: item.hex }} />{item.code}</td><td>{item.hex}</td><td>{item.beads} 颗</td><td>待实物核验</td></tr>)}</tbody></table></div></section>}
    <footer>开源候选许可证：MIT（代码）；MARD 色库保留原始 CC BY 4.0 署名与来源。</footer>
  </main>
}
