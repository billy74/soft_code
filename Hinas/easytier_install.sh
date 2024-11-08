#!/bin/bash
export LANG=en_US.UTF-8
# 定义颜色
re='\e[0m'
red='\e[1;91m'
white='\e[1;97m'
green='\e[1;32m'
yellow='\e[1;33m'
purple='\e[1;35m'
skyblue='\e[1;96m'
gl_hui='\e[37m'
gl_hong='\033[31m'
gl_lv='\033[32m'
gl_huang='\033[33m'
gl_lan='\033[34m'
gl_bai='\033[0m'
gl_zi='\033[35m'
gl_kjlan='\033[96m'
#######################################
down(){

INSTALL_PATH="/etc/zhinan"

# check if unzip is installed
if ! command -v unzip >/dev/null 2>&1; then
  echo -e "\r\n${red}Error: unzip is not installed${re}\r\n"
  exit 1
fi

# check if curl is installed
if ! command -v curl >/dev/null 2>&1; then
  echo -e "\r\n${red}Error: curl is not installed${re}\r\n"
  exit 1
fi

# Get platform
if command -v arch >/dev/null 2>&1; then
  platform=$(arch)
else
  platform=$(uname -m)
fi

case "$platform" in
  amd64 | x86_64)
    ARCH="x86_64"
    ;;
  arm64 | aarch64 | *armv8*)
    ARCH="aarch64"
    ;;
  *armv7*)
    ARCH="armv7"
    ;;
  *arm*)
    ARCH="arm"
    ;;
  mips)
    ARCH="mips"
    ;;
  mipsel)
    ARCH="mipsel"
    ;;
  *)
    ARCH="UNKNOWN"
    ;;
esac

# support hf
if [[ "$ARCH" == "armv7" || "$ARCH" == "arm" ]]; then
  if cat /proc/cpuinfo | grep Features | grep -i 'half' >/dev/null 2>&1; then
    ARCH=${ARCH}hf
  fi
fi

echo -e "\r\n${green}Your platform: ${ARCH} (${platform}) ${re}\r\n" 1>&2

GH_PROXY='https://ghp.ci/'

  # Get version number
  RESPONSE=$(curl -s "https://api.github.com/repos/EasyTier/EasyTier/releases/latest")
  LATEST_VERSION=$(echo "$RESPONSE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
  LATEST_VERSION=$(echo -e "$LATEST_VERSION" | tr -d '[:space:]')

  if [ -z "$LATEST_VERSION" ]; then
    echo -e "\r\n${red}Opus${re}, failure to get latest version. Check your internel\r\nOr try ${green}install by band${re}\r\n"
    exit 1
  fi

  # Download
  echo -e "\r\n${green}Downloading EasyTier $LATEST_VERSION ...${re}"
  rm -rf /tmp/easytier_tmp_install.zip
  curl -L ${GH_PROXY}https://github.com/EasyTier/EasyTier/releases/latest/download/easytier-linux-${ARCH}-${LATEST_VERSION}.zip -o /tmp/easytier_tmp_install.zip $CURL_BAR
  # Unzip resource
  echo -e "\r\n${green}Unzip resource ...${re}"
  unzip -o /tmp/easytier_tmp_install.zip -d $INSTALL_PATH/
#  mkdir $INSTALL_PATH/config
  mv $INSTALL_PATH/easytier-linux-${ARCH}/easytier-core $INSTALL_PATH/zhinan
  rm -rf $INSTALL_PATH/easytier-linux-${ARCH}/
  chmod +x $INSTALL_PATH/zhinan
  if [ -f $INSTALL_PATH/zhinan ]; then
    echo -e "${green} Download successfully! ${re}"
  else
    echo -e "${red} Download failed! ${re}"
    exit 1
  fi


}

config_write(){
ps=""
    siteps=""
    stty erase '^H'  # 设置退格键
    read -p $'\033[1;91m请输入该终端名称: \033[0m' name
    stty sane  # 恢复终端设置
if [ -z "$name" ]; then
	s_name=""
else
	s_name="--hostname $name"
fi

cat <<-EOF > /etc/systemd/system/hinas.service
[Unit]
Description=EasyTier Service
After=network.target syslog.target
Wants=network.target

[Service]
Type=simple
ExecStart=/etc/zhinan/zhinan -d $s_name --network-name hinas --network-secret hnas@123 -p tcp://public.easytier.top:11010

[Install]
WantedBy=multi-user.target
EOF


echo -e "${gl_lan}正在写出配置文件${re}"
sudo -u root mv ./hinas.service /etc/systemd/system/hinas.service
}

# 获取服务状态

SERVICE_NAME="hinas"
status=$(systemctl is-active --quiet $SERVICE_NAME; echo $?)
 
case $status in
    0)
        echo -e "${green}服务正在运行中..."
        ;;
    1)
        echo -e "${gl_hong}$服务已停止"
        ;;
    2)
        echo -e "${skyblue}服务未安装"
        ;;
    3)
        echo -e "${red}服务处于非活动状态"
        ;;
    *)
        echo -e "${green}无法获取状态"
        ;;
esac
echo -e "${yellow} 1. 一键安装 ${re}"
echo -e "${yellow} ----------- ${re}"
echo -e "${yellow} 2. 修改配置 ${re}"
echo -e "${yellow} ----------- ${re}"
echo -e "${yellow} 3. 重载配置 ${re}"
echo -e "${yellow} 4. 重启运行 ${re}"
echo -e "${yellow} 5. 停止运行 ${re}"
echo -e "${yellow} ----------- ${re}"
echo -e "${yellow} 6. 开机自启 ${re}"
echo -e "${yellow} ----------- ${re}"
echo -e "${yellow} 7. 查看网络 ${re}"
echo -e "${yellow} 8. 删除脚本 ${re}"
echo -e "${yellow} ----------- ${re}"
echo -e "${yellow} 0. 退出脚本 ${re}"


    ps=""
    siteps=""
    stty erase '^H'  # 设置退格键
    read -p $'\033[1;91m请输入你的选择: \033[0m' choice
    stty sane  # 恢复终端设置
    case $choice in
	 1)
           
		   down
		   clear
		   bash $0
		   
        ;;
	 2)
           
		   config_write
		   clear
		   bash $0
        ;;
	 3)
           
		   sudo -u root systemctl daemon-reload
		   clear
		   bash $0
        ;;
	 4)
           sudo -u root systemctl restart hinas.service
		   clear
		   bash $0
        ;;
	 5)
           sudo -u root systemctl stop hinas.service
		   clear
		   bash $0
        ;;		
	 6)
           sudo -u root systemctl enable hinas.service
		   clear
		   bash $0
        ;;	
	 7)
           clear
		   curl ping0.cc/geo
		   bash $0
        ;;
	 8)
           clear
		   rm $0
        ;;		
	 0)
            clear
            exit
        ;;	
	 *)
            read -p "无效的输入!"
            ps=""
        ;;	
	esac
