'use client';

import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter,usePathname} from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import '@ant-design/v5-patch-for-react-19'

const { Header } = Layout;

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname()
  const { data: session } = useSession();

  const pathSegments = pathname.split('/').filter(Boolean)

  const userMenuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      disabled: true,
      onClick: () => router.push('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => signOut(),
    },
  ];

  const menuItems = [
    {
      key: 'home',
      label: <Link href="/">首页</Link>,
    },
    {
      key: 'datasets',
      label: <Link href="/datasets">数据集</Link>,
    },
    {
      key: 'tasks',
      label: <Link href="/tasks">任务</Link>,
    },
    {
      key: 'label',
      label: '标注',
      disabled: pathSegments[0]!=="label",
    }
  ];

  return (
    <Header className="flex items-center justify-between px-4">
      <div className="flex items-center">
        <Image src="/logo.png" alt="logo" width={32} height={32} />
        <div className="text-xl font-bold mr-8">LabelMe</div>
        <Menu
          mode="horizontal"
          items={menuItems}
          className="border-none"
          selectedKeys={[pathSegments[0]??"home"]}
        />
      </div>
      <div className="flex items-center">
        {session ? (
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <div className="flex items-center cursor-pointer">
              <Avatar
                icon={<UserOutlined />}
                className="mr-2"
              />
              <span className="ml-2">{session.user?.name ?? '用户'}</span>
            </div>
          </Dropdown>
        ) : (
          <Button type="primary">
            <Link href="/login">登录</Link>
          </Button>
        )}
      </div>
    </Header>
  );
};

export default Navbar; 