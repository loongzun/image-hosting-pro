import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Typography, Card, Image as AntImage, Button, Input, Empty, message, Pagination, List, DatePicker, Dropdown, Space, Radio, Tabs, Spin } from 'antd';
import LazyLoad from 'react-lazyload';
import { CopyOutlined, DeleteOutlined, CalendarOutlined, DownOutlined, SearchOutlined } from '@ant-design/icons';
import { Popconfirm } from 'antd';
import './ImageManager.css';

const { Title, Paragraph } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const ImageManager = () => {
  const [images, setImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'timeline'
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('github-settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      token: '',
      owner: '',
      repo: '',
      branch: 'main',
      path: 'images',
      customDomain: '',
      language: 'zh' // 默认语言为中文
    };
  });
  
  // 语言文本
  const texts = {
    zh: {
      title: '图片管理',
      subtitle: '查看和管理您上传的所有图片，复制链接以便在博客中使用',
      search: '搜索图片名称',
      noImages: '暂无上传的图片',
      noMatchingImages: '没有找到匹配的图片',
      size: '大小',
      uploadTime: '上传时间',
      copyLink: '复制链接',
      deleteRecord: '删除记录',
      deleteConfirmTitle: '确定要删除这条记录吗？',
      deleteConfirmDesc: '删除后将无法恢复，但不会从GitHub仓库中删除图片。',
      confirm: '确定',
      cancel: '取消',
      copySuccess: '链接已复制到剪贴板',
      copyFailed: '复制失败',
      deleteSuccess: '记录已删除',
      startDate: '开始日期',
      endDate: '结束日期',
      clearFilters: '清除筛选',
      originalLink: '原始链接',
      markdownFormat: 'Markdown格式',
      htmlFormat: 'HTML格式',
      bbcodeFormat: 'BBCode格式',
      gridView: '网格视图',
      timelineView: '时间线视图',
      kb: 'KB',
      preview: '预览'
    },
    en: {
      title: 'Image Manager',
      subtitle: 'View and manage all your uploaded images, copy links for use in blogs',
      search: 'Search image name',
      noImages: 'No uploaded images',
      noMatchingImages: 'No matching images found',
      size: 'Size',
      uploadTime: 'Upload Time',
      copyLink: 'Copy Link',
      deleteRecord: 'Delete Record',
      deleteConfirmTitle: 'Are you sure you want to delete this record?',
      deleteConfirmDesc: 'The record cannot be recovered after deletion, but the image will not be deleted from the GitHub repository.',
      confirm: 'Confirm',
      cancel: 'Cancel',
      copySuccess: 'Link copied to clipboard',
      copyFailed: 'Copy failed',
      deleteSuccess: 'Record deleted',
      startDate: 'Start Date',
      endDate: 'End Date',
      clearFilters: 'Clear Filters',
      originalLink: 'Original Link',
      markdownFormat: 'Markdown Format',
      htmlFormat: 'HTML Format',
      bbcodeFormat: 'BBCode Format',
      gridView: 'Grid View',
      timelineView: 'Timeline View',
      kb: 'KB',
      preview: 'Preview'
    }
  };
  
  // 获取当前语言的文本
  const t = texts[settings.language || 'zh'];
  
  const pageSize = 12;

  // 从本地存储加载图片 - 优化性能
  useEffect(() => {
    // 使用异步操作避免阻塞主线程
    const loadImages = async () => {
      try {
        const historyString = localStorage.getItem('upload-history') || '[]';
        const history = JSON.parse(historyString);
        
        // 按日期降序排序，最新的图片显示在前面
        const sortedHistory = [...history].sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        });
        
        setImages(sortedHistory);
        setFilteredImages(sortedHistory);
      } catch (error) {
        console.error('Error loading images:', error);
        message.error('加载图片历史记录失败');
        setImages([]);
        setFilteredImages([]);
      }
    };
    
    loadImages();
  }, []);

  // 搜索图片
  const handleSearch = (value) => {
    setSearchText(value);
    applyFilters(value, dateRange);
  };

  // 日期范围筛选
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    applyFilters(searchText, dates);
  };

  // 应用所有筛选条件 - 使用useCallback优化性能
  const applyFilters = useCallback((text, dates) => {
    // 使用requestAnimationFrame避免在同一帧内进行多次状态更新
    requestAnimationFrame(() => {
      let filtered = [...images];
      
      // 应用文本搜索 - 优化搜索性能
      if (text) {
        const searchTerms = text.toLowerCase().split(' ').filter(term => term.length > 0);
        if (searchTerms.length > 0) {
          filtered = filtered.filter(img => {
            const imgName = img.name.toLowerCase();
            return searchTerms.every(term => imgName.includes(term));
          });
        }
      }
      
      // 应用日期筛选
      if (dates && dates.length === 2) {
        const [startDate, endDate] = dates;
        const start = startDate.startOf('day').valueOf();
        const end = endDate.endOf('day').valueOf();
        
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date).getTime();
          return itemDate >= start && itemDate <= end;
        });
      }
      
      setFilteredImages(filtered);
      setCurrentPage(1);
    });
  }, [images]);

  // 清除所有筛选
  const clearFilters = () => {
    setDateRange(null);
    setSearchText('');
    setFilteredImages(images);
    setCurrentPage(1);
  };

  // 复制链接
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success(t.copySuccess))
      .catch(err => message.error(`${t.copyFailed}: ${err}`));
  };

  // 生成不同格式的链接
  const generateLinks = (item) => {
    // 原始链接
    const originalUrl = item.url;
    
    // Markdown格式
    const markdownUrl = `![${item.name}](${originalUrl})`;
    
    // HTML格式
    const htmlUrl = `<img src="${originalUrl}" alt="${item.name}" />`;
    
    // BBCode格式
    const bbcodeUrl = `[img]${originalUrl}[/img]`;
    
    return {
      original: originalUrl,
      markdown: markdownUrl,
      html: htmlUrl,
      bbcode: bbcodeUrl
    };
  };

  // 删除记录
  const deleteRecord = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    localStorage.setItem('upload-history', JSON.stringify(newImages));
    
    // 更新筛选后的图片
    applyFilters(searchText, dateRange);
    
    message.success(t.deleteSuccess);
  };

  // 分页处理
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // 切换视图模式
  const handleViewModeChange = (e) => {
    setViewMode(e.target.value);
  };

  // 计算当前页的图片 - 使用useMemo优化性能
  const currentImages = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredImages.slice(startIndex, endIndex);
  }, [filteredImages, currentPage, pageSize]);

  // 按日期分组 - 使用useMemo优化性能
  const groupByDate = useCallback((items) => {
    const groups = {};
    
    items.forEach(item => {
      const date = new Date(item.date).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    
    return Object.entries(groups).map(([date, items]) => ({
      date,
      items
    }));
  }, []);
  
  // 使用useMemo缓存分组结果
  const groupedImages = useMemo(() => groupByDate(currentImages), [groupByDate, currentImages]);

  // 渲染网格视图
  const renderGridView = () => (
    <>
      <div className="image-grid">
        {currentImages.map((image, index) => {
          const links = generateLinks(image);
          return (
            <Card
              key={index}
              hoverable
              className="image-card"
              cover={
                <div className="image-container">
                  <LazyLoad height={200} once placeholder={<div className="image-loading"><Spin /></div>}>
                    <AntImage
                      src={image.url}
                      alt={image.name}
                      className="gallery-image"
                      loading="lazy"
                      preview={{
                        mask: <div className="image-preview-mask">{t.preview}</div>
                      }}
                    />
                  </LazyLoad>
                </div>
              }
              actions={[
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'original',
                        label: (
                          <a onClick={() => copyToClipboard(links.original)}>{t.originalLink}</a>
                        ),
                      },
                      {
                        key: 'markdown',
                        label: (
                          <a onClick={() => copyToClipboard(links.markdown)}>{t.markdownFormat}</a>
                        ),
                      },
                      {
                        key: 'html',
                        label: (
                          <a onClick={() => copyToClipboard(links.html)}>{t.htmlFormat}</a>
                        ),
                      },
                      {
                        key: 'bbcode',
                        label: (
                          <a onClick={() => copyToClipboard(links.bbcode)}>{t.bbcodeFormat}</a>
                        ),
                      },
                    ],
                  }}
                >
                  <Button type="text" icon={<CopyOutlined />}>
                    <Space>
                      {t.copyLink}
                      <DownOutlined />
                    </Space>
                  </Button>
                </Dropdown>,
                <Popconfirm
                  title={t.deleteConfirmTitle}
                  description={t.deleteConfirmDesc}
                  onConfirm={() => deleteRecord(images.findIndex(img => img.date === image.date && img.name === image.name))}
                  okText={t.confirm}
                  cancelText={t.cancel}
                >
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />}
                  >
                    {t.deleteRecord}
                  </Button>
                </Popconfirm>
              ]}
            >
              <Card.Meta
                title={image.name}
                description={
                  <div className="image-info">
                    <p>{t.size}: {(image.size / 1024).toFixed(1)} {t.kb}</p>
                    <p>{t.uploadTime}: {new Date(image.date).toLocaleString()}</p>
                  </div>
                }
              />
            </Card>
          );
        })}
      </div>

      <div className="pagination-container">
        <Pagination
          current={currentPage}
          total={filteredImages.length}
          pageSize={pageSize}
          onChange={handlePageChange}
          showSizeChanger={false}
        />
      </div>
    </>
  );

  // 渲染时间线视图
  const renderTimelineView = () => (
    <div className="history-timeline">
      {groupedImages.map((group, groupIndex) => (
        <div key={groupIndex} className="history-group">
          <div className="history-date">
            <CalendarOutlined /> {group.date}
          </div>
          <List
            className="history-list"
            itemLayout="horizontal"
            dataSource={group.items}
            renderItem={(item) => {
              const links = generateLinks(item);
              return (
                <List.Item>
                  <Card className="history-card">
                    <div className="history-card-content">
                      <div className="history-image-container">
                        <LazyLoad height={120} once placeholder={<div className="image-loading"><Spin /></div>}>
                          <AntImage
                            src={item.url}
                            alt={item.name}
                            className="history-image"
                            loading="lazy"
                            preview={{
                              mask: <div className="image-preview-mask">{t.preview}</div>
                            }}
                          />
                        </LazyLoad>
                      </div>
                      <div className="history-item-info">
                        <h4>{item.name}</h4>
                        <p>{t.size}: {(item.size / 1024).toFixed(1)} {t.kb}</p>
                        <p>{t.uploadTime}: {new Date(item.date).toLocaleString()}</p>
                        <p className="history-item-url">{item.url}</p>
                      </div>
                    </div>
                    <div className="history-item-actions">
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'original',
                              label: (
                                <a onClick={() => copyToClipboard(links.original)}>{t.originalLink}</a>
                              ),
                            },
                            {
                              key: 'markdown',
                              label: (
                                <a onClick={() => copyToClipboard(links.markdown)}>{t.markdownFormat}</a>
                              ),
                            },
                            {
                              key: 'html',
                              label: (
                                <a onClick={() => copyToClipboard(links.html)}>{t.htmlFormat}</a>
                              ),
                            },
                            {
                              key: 'bbcode',
                              label: (
                                <a onClick={() => copyToClipboard(links.bbcode)}>{t.bbcodeFormat}</a>
                              ),
                            },
                          ],
                        }}
                      >
                        <Button type="text" icon={<CopyOutlined />}>
                          <Space>
                            {t.copyLink}
                            <DownOutlined />
                          </Space>
                        </Button>
                      </Dropdown>
                      <Popconfirm
                        title={t.deleteConfirmTitle}
                        description={t.deleteConfirmDesc}
                        onConfirm={() => deleteRecord(images.findIndex(img => img.date === item.date && img.name === item.name))}
                        okText={t.confirm}
                        cancelText={t.cancel}
                      >
                        <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />}
                        >
                          {t.deleteRecord}
                        </Button>
                      </Popconfirm>
                    </div>
                  </Card>
                </List.Item>
              );
            }}
          />
        </div>
      ))}

      <div className="pagination-container">
        <Pagination
          current={currentPage}
          total={filteredImages.length}
          pageSize={pageSize}
          onChange={handlePageChange}
          showSizeChanger={false}
        />
      </div>
    </div>
  );

  return (
    <div className="image-manager-container">
      <Typography className="image-manager-header">
        <Title level={2}>{t.title}</Title>
        <Paragraph>
          {t.subtitle}
        </Paragraph>
      </Typography>

      <div className="image-manager-actions">
        <div className="search-filter-container">
          <Search
            placeholder={t.search}
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
            value={searchText}
            className="search-input"
          />
          
          <div className="date-filter">
            <RangePicker 
              onChange={handleDateRangeChange} 
              value={dateRange}
              placeholder={[t.startDate, t.endDate]}
              allowClear
            />
          </div>
          
          {(dateRange || searchText) && (
            <Button onClick={clearFilters}>{t.clearFilters}</Button>
          )}
        </div>
        
        <div className="view-mode-selector">
          <Radio.Group value={viewMode} onChange={handleViewModeChange}>
            <Radio.Button value="grid">{t.gridView}</Radio.Button>
            <Radio.Button value="timeline">{t.timelineView}</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      {filteredImages.length === 0 ? (
        <Empty
          description={
            <span>
              {images.length === 0 ? t.noImages : t.noMatchingImages}
            </span>
          }
          className="empty-container"
        />
      ) : (
        viewMode === 'grid' ? renderGridView() : renderTimelineView()
      )}
    </div>
  );
};

export default ImageManager;