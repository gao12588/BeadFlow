import { ChangeEvent, useMemo, useState } from 'react'
import palette from './data/mard_221_reference.json'
import { buildPattern, calculateAutoHeight } from './engine'
import { download, exportZip } from './export'
import { renderConstructionChart } from './render'
import type { Pattern } from './types'
import './style.css'

const number = (event: ChangeEvent<HTMLInputElement>) => Number(event.target.value)

export default function App() {
  const width = 50
  const [height, setHeight] = useState(50), [colors, setColors] = useState(16), [safeMargin, setSafeMargin] = useState(3), [title, setTitle] = useState('我的拼豆施工图')
  const [image, setImage] = useState<ImageData | null>(null), [pattern, setPattern] = useState<Pattern | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const preview = useMemo(() => {
    if (!pattern) return ''
    return renderConstructionChart(pattern, title, 30).toDataURL()
  }, [pattern, title])
  const load = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setError('请选择 JPG、PNG、WebP 等图片文件。'); return }
    const reader = new FileReader(); reader.onload = () => {
      const photo = new Image(); photo.onload = () => { const canvas = document.createElement('canvas'); canvas.width = photo.naturalWidth; canvas.height = photo.naturalHeight; canvas.getContext('2d')!.drawImage(photo, 0, 0); setImage(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)); setHeight(calculateAutoHeight(photo.naturalWidth, photo.naturalHeight, width, safeMargin)); setPattern(null); setError('') }; photo.onerror = () => setError('该图片无法读取。'); photo.src = String(reader.result)
    }; reader.readAsDataURL(file)
  }
  const updateMargin = (value: number) => { setSafeMargin(value); if (image) setHeight(calculateAutoHeight(image.width, image.height, width, value)); setPattern(null) }
  const generate = () => { if (!image) { setError('请先上传一张照片。'); return }; setPattern(buildPattern(image, width, height, colors, palette, safeMargin)); setError('') }
  const save = async () => { if (!pattern) return; setBusy(true); try { download(await exportZip(pattern, title), 'beadflow_construction_package.zip') } catch { setError('导出失败，请重试。') } finally { setBusy(false) } }
  return <main>
    <header><p className="eyebrow">LOCAL-FIRST BEAD PATTERN MAKER</p><h1>BeadFlow</h1><p>把照片变成可真正制作的 MARD 拼豆图纸。</p><span>所有处理只在当前浏览器完成 · 无登录 · 无 API · 不上传照片</span></header>
    <section className="workspace">
      <aside className="controls"><h2>施工图设置</h2><label className="upload">上传照片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={load} /></label>
        <div className="field"><label>图纸标题<input aria-label="图纸标题" value={title} maxLength={40} onChange={(event) => setTitle(event.target.value || '我的拼豆施工图')} /></label></div>
        <div className="field static-field"><span>图纸宽度</span><b>{width} 格（固定）</b></div>
        <div className="field static-field"><span>图纸高度</span><b>{height} 格（按照片比例）</b></div>
        <div className="field"><label>最大色数 <b>{colors}</b> 色<input aria-label="最大色数" type="range" min="2" max="16" value={colors} onChange={(e) => { setColors(number(e)); setPattern(null) }} /></label></div>
        <div className="field"><label>主体安全边距 <b>{safeMargin}</b> 格<input aria-label="主体安全边距" type="range" min="2" max="5" value={safeMargin} onChange={(e) => updateMargin(number(e))} /></label></div>
        <button className="primary" onClick={generate}>生成拼豆图纸</button>{error && <p className="error" role="alert">{error}</p>}
        <p className="note">2.6mm mini 豆 · MARD 221 色屏幕参考 · 深色外轮廓。请上传主体清晰、正面、背景简洁的图片；人脸细节需以生成结果和实物小样为准。</p>
      </aside>
      <section className="result"><div className="result-head"><div><p className="eyebrow">预览</p><h2>{pattern ? `${pattern.width} × ${pattern.height} 格` : '等待上传照片'}</h2></div>{pattern && <button onClick={save} disabled={busy}>{busy ? '正在打包…' : '下载 PNG · PDF · JSON · ZIP'}</button>}</div>
        {preview ? <img className="preview" src={preview} alt="带坐标和色号的拼豆施工主图" /> : <div className="empty">上传图片后即可生成带坐标、格内色号、每 10 格辅助线的高清施工主图。</div>}
      </section>
    </section>
    {pattern && <section className="details"><div><h2>色卡与采购清单</h2><p>{pattern.width * pattern.height} 颗 · {pattern.width} × {pattern.height} 格 · {pattern.materials.length} 色 · {pattern.boards.length} 块 29×29 底板</p></div><div className="table-wrap"><table><thead><tr><th>色号</th><th>颜色名称</th><th>实际数量</th><th>建议购买（+5%）</th></tr></thead><tbody>{pattern.materials.map((item) => <tr key={item.code}><td><i style={{ background: item.hex }} />{item.code}</td><td>{item.name}</td><td>{item.beads} 颗</td><td>{Math.ceil(item.beads * 1.05)} 颗</td></tr>)}</tbody></table></div></section>}
    <footer>开源候选许可证：MIT（代码）；MARD 色库保留原始 CC BY 4.0 署名与来源。</footer>
  </main>
}
