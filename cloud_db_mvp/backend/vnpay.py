"""
vnpay.py - VNPay payment gateway integration
- Create payment URL with checksum
- Verify IPN callback
"""

import hmac
import hashlib
import urllib.parse
from urllib.parse import urlencode, quote
import os
from datetime import datetime

# VNPay configuration
VNPAY_TMN_CODE = os.getenv("VNPAY_TMN_CODE", "")
VNPAY_SECRET_KEY = os.getenv("VNPAY_SECRET_KEY", "")
VNPAY_URL = os.getenv("VNPAY_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
VNPAY_RETURN_URL = os.getenv("VNPAY_RETURN_URL", "")


def vnp_create_payment_url(order_id: str, amount: int, order_desc: str, order_type: str = "other", 
                           bank_code: str = "", language: str = "vn", ip_addr: str = "") -> str:
    """
    Tạo URL thanh toán VNPay
    
    Args:
        order_id: Mã đơn hàng (unique)
        amount: Số tiền thanh toán (VND)
        order_desc: Mô tả đơn hàng
        order_type: Loại đơn hàng (default: "other")
        bank_code: Mã ngân hàng (optional)
        language: Ngôn ngữ (vn/en)
        ip_addr: IP khách hàng
    
    Returns:
        URL thanh toán VNPay
    """
    vnp_Params = {}
    vnp_Params['vnp_Version'] = '2.1.0'
    vnp_Params['vnp_Command'] = 'pay'
    vnp_Params['vnp_TmnCode'] = VNPAY_TMN_CODE
    vnp_Params['vnp_Amount'] = amount * 100  # VNPay yêu cầu số tiền nhân 100
    vnp_Params['vnp_CurrCode'] = 'VND'
    vnp_Params['vnp_TxnRef'] = order_id
    vnp_Params['vnp_OrderInfo'] = order_desc
    vnp_Params['vnp_OrderType'] = order_type
    vnp_Params['vnp_Locale'] = language
    vnp_Params['vnp_ReturnUrl'] = VNPAY_RETURN_URL
    
    if bank_code:
        vnp_Params['vnp_BankCode'] = bank_code
    
    if ip_addr:
        vnp_Params['vnp_IpAddr'] = ip_addr
    
    # Thêm thời gian tạo đơn
    vnp_Params['vnp_CreateDate'] = datetime.now().strftime('%Y%m%d%H%M%S')
    
    # Sắp xếp lại các tham số theo thứ tự alphabet
    vnp_Params = dict(sorted(vnp_Params.items()))
    
    # Tạo query string
    query_string = urlencode(vnp_Params, doseq=True)
    
    # Tạo checksum
    hmac_sha512 = hmac.new(
        VNPAY_SECRET_KEY.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()
    
    vnp_Params['vnp_SecureHash'] = hmac_sha512
    
    # Tạo URL thanh toán
    payment_url = VNPAY_URL + '?' + urlencode(vnp_Params, doseq=True)
    
    return payment_url


def vnp_verify_checksum(vnp_Params: dict) -> bool:
    """
    Verify checksum từ IPN callback của VNPay
    
    Args:
        vnp_Params: Dictionary chứa các tham số từ VNPay callback
    
    Returns:
        True nếu checksum hợp lệ, False nếu không
    """
    vnp_SecureHash = vnp_Params.pop('vnp_SecureHash', '')
    
    # Sắp xếp lại các tham số (loại bỏ SecureHash)
    vnp_Params = {k: v for k, v in vnp_Params.items() if k != 'vnp_SecureHash'}
    vnp_Params = dict(sorted(vnp_Params.items()))
    
    # Tạo query string
    query_string = urlencode(vnp_Params, doseq=True)
    
    # Tạo checksum
    hmac_sha512 = hmac.new(
        VNPAY_SECRET_KEY.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()
    
    # So sánh checksum
    return hmac_sha512 == vnp_SecureHash


def vnp_parse_callback(params: dict) -> dict:
    """
    Parse và validate callback từ VNPay
    
    Args:
        params: Dictionary chứa các tham số từ VNPay callback
    
    Returns:
        Dictionary chứa thông tin đã parse
    """
    result = {
        'order_id': params.get('vnp_TxnRef', ''),
        'transaction_id': params.get('vnp_TransactionNo', ''),
        'amount': int(params.get('vnp_Amount', 0)) // 100,  # Chia 100 để lấy số tiền thực
        'response_code': params.get('vnp_ResponseCode', ''),
        'transaction_status': params.get('vnp_TransactionStatus', ''),
        'bank_code': params.get('vnp_BankCode', ''),
        'card_type': params.get('vnp_CardType', ''),
        'order_info': params.get('vnp_OrderInfo', ''),
        'pay_date': params.get('vnp_PayDate', ''),
        'is_valid': False
    }
    
    # Verify checksum
    if vnp_verify_checksum(params.copy()):
        result['is_valid'] = True
    
    # Kiểm tra response code (00 = thành công)
    result['is_success'] = result['response_code'] == '00' and result['is_valid']
    
    return result

