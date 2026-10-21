"""Local Streamlit UI. Uploaded image bytes remain in this local process."""
from __future__ import annotations

import tempfile
from pathlib import Path

import streamlit as st

from beadflow_core.exporting import export_bundle, manifest
from beadflow_core.pipeline import build_pattern
from beadflow_core.rendering import render_preview

st.set_page_config(page_title="BeadFlow", layout="wide")
st.title("BeadFlow — 照片转 MARD 拼豆图纸")
st.caption("完全在本机处理；不会上传照片到第三方服务。MARD RGB 为可追溯屏幕参考值，须以实物色卡核验。")
upload = st.file_uploader("上传照片", type=["jpg", "jpeg", "png", "webp"])
left, middle, right = st.columns(3)
with left: width = st.slider("宽度（颗）", 1, 180, 58)
with middle: height = st.slider("高度（颗）", 1, 180, 58)
with right: colors = st.slider("最大颜色数", 1, 64, 18)
fit = st.radio("适配方式", {"留白（不裁切）": "pad", "裁切填满": "crop"}, horizontal=True)
if upload and st.button("生成图纸", type="primary"):
    try:
        pattern = build_pattern(upload, width, height, colors, fit=fit)
        with tempfile.TemporaryDirectory(prefix="beadflow-") as temporary:
            bundle = export_bundle(pattern, temporary)
            st.session_state["bundle"] = Path(bundle).read_bytes()
            st.session_state["preview"] = render_preview(pattern)
            st.session_state["summary"] = manifest(pattern)
    except ValueError as exc:
        st.error(str(exc))
if "preview" in st.session_state:
    st.image(st.session_state["preview"], caption="拼豆预览", use_container_width=True)
    details = st.session_state["summary"]
    st.write(f"{details['grid']['width']}×{details['grid']['height']}，共 {details['grid']['total_beads']} 颗，{len(details['materials'])} 色，{len(details['boards'])} 块 29×29 底板。")
    st.dataframe(details["materials"], use_container_width=True, hide_index=True)
    st.download_button("下载 ZIP（PNG + 分块打印 PDF + JSON 清单）", st.session_state["bundle"], "beadflow_pattern.zip", "application/zip", type="primary")
