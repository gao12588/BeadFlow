import { ChangeEvent, useMemo, useState } from 'react'
import palette from './data/mard_221_reference.json'
import { buildPattern, calculateAutoHeight } from './engine'
import { download, exportZip } from './export'
import { renderConstructionChart, renderMaterialSheet } from './render'
import type { Pattern } from './types'
import './style.css'

const number = (event: ChangeEvent<HTMLInputElement>) => Number(event.target.value)

export default function App() {
  const width = 50
  const [height, setHeight] = useState(50), [colors, setColors] = useState(16), [safeMargin, setSafeMargin] = useState(3), [title, setTitle] = useState('我的拼豆施工图')
  const [image, setImage] = useState<ImageData | null>(null), [pattern, setPattern] = useState<Pattern | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [activeOutput, setActiveOutput] = useState<'pattern' | 'materials'>('pattern'), [withOutline, setWithOutline] = useState(true)
  const previews = useMemo(() => {
    if (!pattern) return ''
    return { pattern: renderConstructionChart(pattern, title, 30).toDataURL(), materials: renderMaterialSheet(pattern, title).toDataURL() }
  }, [pattern, title])
  const loadFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('请选择 JPG、PNG、WebP 等图片文件。'); return }
    const reader = new FileReader(); reader.onload = () => {
      const photo = new Image(); photo.onload = () => { const canvas = document.createElement('canvas'); canvas.width = photo.naturalWidth; canvas.height = photo.naturalHeight; canvas.getContext('2d')!.drawImage(photo, 0, 0); setImage(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)); setHeight(calculateAutoHeight(photo.naturalWidth, photo.naturalHeight, width, safeMargin)); setPattern(null); setError('') }; photo.onerror = () => setError('该图片无法读取。'); photo.src = String(reader.result)
    }; reader.readAsDataURL(file)
  }
  const load = (event: ChangeEvent<HTMLInputElement>) => loadFile(event.target.files?.[0])
  const updateMargin = (value: number) => { setSafeMargin(value); if (image) setHeight(calculateAutoHeight(image.width, image.height, width, value)); setPattern(null) }
  const generate = () => { if (!image) { setError('请先上传一张照片。'); return }; setPattern(buildPattern(image, width, height, colors, palette, safeMargin, withOutline)); setActiveOutput('pattern'); setError('') }
  const save = async () => { if (!pattern) return; setBusy(true); try { download(await exportZip(pattern, title), 'beadflow_construction_package.zip') } catch { setError('导出失败，请重试。') } finally { setBusy(false) } }
  return <main>
    <nav><a href="#top" aria-label="BeadFlow 首页">BEADFLOW</a><span>拼豆施工图</span><span className="nav-right">本地处理 · MARD 221</span></nav>
    <header id="top" className="hero"><p className="eyebrow">MINI 2.6 MM · 50 格施工标准 · ≤16 色</p><h1>让每一格，<em>都能落到豆板上。</em></h1><p>上传图片，生成带坐标、逐格色号、材料用量和采购清单的高清拼豆施工图。</p><div className="hero-actions"><a href="#studio">开始制作 <b>↓</b></a><span>✓ 不上传图片　✓ PNG/PDF/ZIP　✓ 数量自动核算</span></div></header>
    <section className="standards" aria-label="施工标准"><article><b>01</b><h2>每格一颗纯色豆</h2><p>不使用渐变、透明或照片笔刷。</p></article><article><b>02</b><h2>每 10 格粗辅助线</h2><p>横纵坐标均从 1 开始。</p></article><article><b>03</b><h2>深色外轮廓</h2><p>自动采用 MARD H7 保护主体边缘。</p></article><article><b>04</b><h2>完整色卡与统计</h2><p>采购数自动含 5% 备用量。</p></article></section>
    <section id="studio" className="studio"><div className="section-label">WORKBENCH / ONLINE</div><h2>生成你的施工图</h2><p className="intro">图纸固定宽度 50 格，高度按主体比例计算。建议使用主体正面清晰、背景简洁的图片。</p>
      <div className="workspace">
      <aside className="controls"><div className="panel-heading"><span>输入与参数</span><b>01 / 02</b></div><label className="upload" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); loadFile(event.dataTransfer.files[0]) }}> <span className="upload-mark">＋</span><strong>{image ? '已读取图片，可重新选择' : '把图片拖到这里'}</strong><small>PNG / JPG / WEBP，图片不会上传</small><span className="file-button">选择图片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={load} /></span></label>
        <div className="field"><label>图纸标题<input aria-label="图纸标题" value={title} maxLength={40} onChange={(event) => setTitle(event.target.value || '我的拼豆施工图')} /></label></div>
        <div className="spec-row"><span>图纸宽度 <b>{width} 格</b></span><span>拼豆规格 <b>2.6 mm</b></span><span>参考色卡 <b>MARD 221</b></span></div>
        <div className="field"><label>最大色数 <b>{colors} 色</b><input aria-label="最大色数" type="range" min="2" max="16" value={colors} onChange={(e) => { setColors(number(e)); setPattern(null) }} /></label></div>
        <div className="field"><label>安全边距 <b>{safeMargin} 格</b><input aria-label="主体安全边距" type="range" min="2" max="5" value={safeMargin} onChange={(e) => updateMargin(number(e))} /></label></div>
        <label className="toggle-row"><input aria-label="深色外轮廓" type="checkbox" checked={withOutline} onChange={(event) => { setWithOutline(event.target.checked); setPattern(null) }} /><span><b>深色外轮廓</b><small>自动为主体边缘加入 MARD 深色豆</small></span></label>
        <div className="auto-height">自动高度 <b>{height} 格</b><span>按图片比例与安全边距计算</span></div>
        <button className="primary" onClick={generate}>生成两张施工图 <b>→</b></button>{error && <p className="error" role="alert">{error}</p>}
        <p className="note">🔒 所有计算只在你的浏览器本地完成。MARD 色值是带来源的屏幕参考，正式制作前请以实物色卡复核。</p>
      </aside>
      <section className="result"><div className="result-head"><div><p className="eyebrow">输出预览</p><h2>{pattern ? `${pattern.width} × ${pattern.height} 格 · ${pattern.materials.length} 色` : '等待上传图片'}</h2></div>{pattern && <button className="download" onClick={save} disabled={busy}>{busy ? '正在打包…' : '下载施工包 ↗'}</button>}</div>
        <div className="tabs" role="tablist"><button className={activeOutput === 'pattern' ? 'active' : ''} onClick={() => setActiveOutput('pattern')} role="tab" aria-selected={activeOutput === 'pattern'}>01　施工主图</button><button className={activeOutput === 'materials' ? 'active' : ''} onClick={() => setActiveOutput('materials')} role="tab" aria-selected={activeOutput === 'materials'}>02　色卡统计</button></div>
        {previews ? <img className="preview" src={previews[activeOutput]} alt={activeOutput === 'pattern' ? '带坐标和色号的拼豆施工主图' : '色卡与采购统计'} /> : <div className="empty"><b>＋</b><h3>施工图会在这里生成</h3><p>上传图片并调整参数后，点击“生成两张施工图”。</p></div>}
      </section>
      </div>
    </section>
    {pattern && <section className="details"><div><h2>色卡与采购清单</h2><p>{pattern.width * pattern.height} 颗 · {pattern.width} × {pattern.height} 格 · {pattern.materials.length} 色 · {pattern.boards.length} 块 29×29 底板</p></div><div className="table-wrap"><table><thead><tr><th>色号</th><th>颜色名称</th><th>实际数量</th><th>建议购买（+5%）</th></tr></thead><tbody>{pattern.materials.map((item) => <tr key={item.code}><td><i style={{ background: item.hex }} />{item.code}</td><td>{item.name}</td><td>{item.beads} 颗</td><td>{Math.ceil(item.beads * 1.05)} 颗</td></tr>)}</tbody></table></div></section>}
    <section className="explain"><article><span>输出 01</span><h2>逐格可读的施工主图</h2><p>完整横纵坐标、每格中心色号、每 10 格粗辅助线。每一个格子都对应实际的一颗拼豆。</p></article><article><span>输出 02</span><h2>采购前就算清楚</h2><p>按色号排序的色卡、实际数量与 +5% 建议购买量，并附易混色、熨烫和分板建议。</p></article></section>
    <footer><b>BEADFLOW</b><span>拼豆施工图 · 为实际施工而设计</span><span>MARD 色值参考：MakeBead craft-color-codes（CC BY 4.0）</span></footer>
  </main>
}
