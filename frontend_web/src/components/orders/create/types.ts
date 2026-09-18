export interface ProductItem {
  id: number;
  name: string;
  price: number;
  weight: number | string; // kg
  quantity: number | string;
  imageUrl?: string;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface TouchedFields {
  [key: string]: boolean;
}

export interface TouchedProducts {
  [index: number]: {
    name?: boolean;
    weight?: boolean;
    quantity?: boolean;
    price?: boolean;
  };
}

export const VIETNAM_ADMIN_UNITS: {
  [province: string]: {
    [district: string]: string[];
  };
} = {
  'Hà Nội': {
    'Quận Hoàn Kiếm': ['Phường Hàng Bài', 'Phường Tràng Tiền', 'Phường Cửa Nam', 'Phường Hàng Trống'],
    'Quận Thanh Xuân': ['Phường Thanh Xuân Trung', 'Phường Nhân Chính', 'Phường Khương Đình', 'Phường Khương Mai'],
    'Quận Cầu Giấy': ['Phường Dịch Vọng', 'Phường Nghĩa Tân', 'Phường Mai Dịch', 'Phường Quan Hoa'],
    'Quận Ba Đình': ['Phường Điện Biên', 'Phường Đội Cấn', 'Phường Kim Mã', 'Phường Liễu Giai'],
    'Quận Đống Đa': ['Phường Láng Thượng', 'Phường Ô Chợ Dừa', 'Phường Kim Liên'],
    'Quận Hai Bà Trưng': ['Phường Bạch Đằng', 'Phường Bách Khoa', 'Phường Minh Khai'],
  },
  'TP Hồ Chí Minh': {
    'Quận Tân Bình': ['Phường 12', 'Phường 13', 'Phường 4', 'Phường 2', 'Phường 15'],
    'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho', 'Phường Đa Kao'],
    'Quận 5': ['Phường 1', 'Phường 2', 'Phường 5', 'Phường 7', 'Phường 11'],
    'Quận Bình Thạnh': ['Phường 1', 'Phường 2', 'Phường 14', 'Phường 25'],
    'Thành phố Thủ Đức': ['Phường Thảo Điền', 'Phường An Phú', 'Phường Linh Trung', 'Phường Hiệp Bình Chánh'],
  },
  'Đà Nẵng': {
    'Quận Hải Châu': ['Phường Hải Châu 1', 'Phường Hải Châu 2', 'Phường Thạch Thang'],
    'Quận Thanh Khê': ['Phường Tam Thuận', 'Phường Thanh Khê Tây'],
  },
  'Hải Phòng': {
    'Quận Hồng Bàng': ['Phường Hoàng Văn Thụ', 'Phường Minh Khai'],
    'Quận Ngô Quyền': ['Phường Lạc Viên', 'Phường Cầu Đất'],
  },
  'Cần Thơ': {
    'Quận Ninh Kiều': ['Phường Tân An', 'Phường An Cư', 'Phường Xuân Khánh'],
  },
  'Bình Dương': {
    'Thành phố Thủ Dầu Một': ['Phường Phú Cường', 'Phường Hiệp Thành'],
    'Thành phố Thuận An': ['Phường Lái Thiêu', 'Phường An Phú'],
  },
  'Đồng Nai': {
    'Thành phố Biên Hòa': ['Phường Trảng Dài', 'Phường Tân Hiệp'],
  },
};
