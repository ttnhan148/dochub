"""
DocHub AI Module
Kết nối tới Azure AI Foundry hoặc OpenAI-compatible endpoint (BYOK)
Hỗ trợ kiểm tra kết nối, gợi ý thẻ (tags) và dịch tài liệu song ngữ.
"""

import httpx
import json
from typing import List, Dict, Any, Optional


def _build_headers(api_key: str) -> Dict[str, str]:
    """Tạo header tương thích cả OpenAI chuẩn và Azure AI Foundry"""
    return {
        "Authorization": f"Bearer {api_key}",
        "api-key": api_key,
        "Content-Type": "application/json",
    }


async def test_ai_connection(api_base_url: str, api_key: str, model_name: str) -> Dict[str, Any]:
    """Kiểm tra kết nối và key tới endpoint OpenAI-compatible một cách an toàn"""
    url = f"{api_base_url.rstrip('/')}/chat/completions"
    headers = _build_headers(api_key)
    payload = {
        "model": model_name,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 5,
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                return {"success": True, "message": "Kết nối thành công tới AI model!"}
            return {
                "success": False,
                "message": f"Endpoint trả về mã lỗi {response.status_code}: {response.text[:200]}",
            }
    except httpx.TimeoutException:
        return {"success": False, "message": "Hết thời gian chờ kết nối (Request timeout)"}
    except Exception as e:
        return {"success": False, "message": f"Không thể kết nối tới AI endpoint: {str(e)}"}


async def suggest_tags_and_category(
    api_base_url: str, api_key: str, model_name: str, title: str, content_sample: str
) -> List[str]:
    """Gợi ý danh sách tag cho tài liệu dựa trên tiêu đề và nội dung"""
    url = f"{api_base_url.rstrip('/')}/chat/completions"
    headers = _build_headers(api_key)
    prompt = (
        f"Hãy phân tích tài liệu sau và trả về duy nhất một mảng JSON các từ khóa/tags ngắn gọn (tối đa 5 tags):\n"
        f"Tiêu đề: {title}\n"
        f"Nội dung: {content_sample[:2000]}\n"
        f"Định dạng trả về: [\"tag1\", \"tag2\"]"
    )
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": "Bạn là trợ lý phân loại tài liệu thông minh. Chỉ trả về JSON array."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                res_data = response.json()
                raw_text = res_data["choices"][0]["message"]["content"].strip()
                # Parse JSON
                if "[" in raw_text and "]" in raw_text:
                    json_str = raw_text[raw_text.find("["):raw_text.rfind("]") + 1]
                    return json.loads(json_str)
    except Exception as e:
        print(f"[-] Lỗi AI suggest tags: {e}")
    return []


async def translate_content(
    api_base_url: str,
    api_key: str,
    model_name: str,
    content: str,
    target_lang: str = "English",
    doc_type: str = "markdown",
) -> str:
    """Dịch nội dung văn bản sang ngôn ngữ đích, bảo toàn cấu trúc Markdown hoặc HTML"""
    url = f"{api_base_url.rstrip('/')}/chat/completions"
    headers = _build_headers(api_key)

    system_instruction = (
        f"Bạn là dịch giả tài liệu chuyên nghiệp. Hãy dịch nội dung sang tiếng {target_lang}.\n"
        f"YÊU CẦU QUAN TRỌNG: Giữ nguyên 100% định dạng {doc_type.upper()}, các thẻ HTML, block code, "
        f"công thức KaTeX/LaTeX, diagram Mermaid, và các URL/link ảnh. Chỉ dịch phần văn bản hiển thị. "
        f"Không tự ý thêm lời chào hay giải thích nào khác."
    )

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": content},
        ],
        "temperature": 0.2,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise Exception(f"AI endpoint trả về lỗi {response.status_code}: {response.text[:200]}")
        res_data = response.json()
        return res_data["choices"][0]["message"]["content"].strip()

